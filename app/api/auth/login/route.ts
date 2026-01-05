import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';

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
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        displayName: true,
        avatar: true,
        bio: true,
        emailVerified: true,
        createdAt: true,
      },
    });

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
        emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };

    // Create response first
    const response = NextResponse.json(
      { message: 'Login successful', user: userData },
      { status: 200 }
    );

    // Set cookie directly on the response
    // This ensures the cookie is included in the response headers
    const SESSION_COOKIE_NAME = 'session';
    const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
    
    response.cookies.set(SESSION_COOKIE_NAME, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    console.log('[Login API] Cookie set on response:', {
      'set-cookie': response.headers.get('set-cookie'),
      'cookie-name': SESSION_COOKIE_NAME,
      'cookie-value': user.id,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

