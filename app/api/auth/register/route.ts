import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { generateEmailVerificationToken, getEmailVerificationExpiration } from '@/lib/auth/tokens';
import { resend, FROM_EMAIL } from '@/lib/email/resend';
import { getEmailVerificationEmailHtml, getEmailVerificationEmailText } from '@/lib/email/templates/email-verification';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password, displayName } = body;

    // Validation
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    // Explicitly select only fields that definitely exist to avoid migration issues
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email verification token and expiration
    const verificationToken = generateEmailVerificationToken();
    const expiration = getEmailVerificationExpiration();

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName: displayName || username,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: expiration,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Create session
    await createSession(user.id);

    // Send verification email (don't fail registration if email fails)
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: 'Verify Your Email - InterlinedList',
        html: getEmailVerificationEmailHtml(verificationToken, user.displayName || user.username),
        text: getEmailVerificationEmailText(verificationToken, user.displayName || user.username),
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail the request if email fails - log it
      // In production, you might want to use a queue system
    }

    return NextResponse.json(
      { message: 'User created successfully', user },
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

