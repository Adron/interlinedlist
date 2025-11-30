import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { generateRandomToken, getExpirationDate } from '@/lib/auth/jwt';
import { validateRegistrationInput } from '@/lib/auth/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password } = body;

    // Validate input
    const inputValidation = validateRegistrationInput({
      username,
      email,
      password,
    });
    if (!inputValidation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', errors: inputValidation.errors },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          error: 'Password validation failed',
          errors: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        emailVerified: false,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Generate email verification token
    const verificationToken = generateRandomToken();
    const expiresAt = getExpirationDate(1); // 1 day expiration

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt,
      },
    });

    // TODO: Send verification email
    // For now, we'll return the token in development
    // In production, this should be sent via email

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user,
        verificationToken:
          process.env.NODE_ENV === 'development'
            ? verificationToken
            : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
