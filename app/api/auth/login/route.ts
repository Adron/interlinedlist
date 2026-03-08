import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, getSessionCookieOptions } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    // Explicitly select only fields we need to avoid migration issues
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          passwordHash: true,
          displayName: true,
          avatar: true,
          bio: true,
          theme: true,
          emailVerified: true,
          createdAt: true,
        },
      });
    } catch (prismaError: any) {
      throw prismaError;
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Return user data (without password hash)
    const userData = {
        id: user.id,
      email: user.email,
        username: user.username,
        displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
        theme: user.theme,
        emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };

    // Create response first
    const response = NextResponse.json(
      { message: 'Login successful', user: userData },
      { status: 200 }
    );

    // Create session and set cookie on response
    const cookieValue = await createSession(user.id);
    response.cookies.set(SESSION_COOKIE_NAME, cookieValue, getSessionCookieOptions());

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

