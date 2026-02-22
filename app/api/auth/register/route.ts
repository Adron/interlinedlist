import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { generateEmailVerificationToken, getEmailVerificationExpiration } from '@/lib/auth/tokens';
import { resend, FROM_EMAIL } from '@/lib/email/resend';
import { logEmailSend } from '@/lib/email/log-email';
import { getEmailVerificationEmailHtml, getEmailVerificationEmailText } from '@/lib/email/templates/email-verification';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, APP_CONFIG } from '@/lib/config/app';
import { ensureUserInPublicOrganization } from '@/lib/organizations/queries';

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

    // Create user - try with email verification fields first, fall back if columns don't exist
    let user;
    let hasEmailVerificationFields = false;
    try {
      user = await prisma.user.create({
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
          theme: true,
          emailVerified: true,
          createdAt: true,
        },
      });
      hasEmailVerificationFields = true;
    } catch (error: any) {
      // If email verification columns don't exist, create user without them
      if (error?.code === 'P2022' && error?.meta?.column?.includes('emailVerification')) {
        user = await prisma.user.create({
          data: {
            email,
            username,
            passwordHash,
            displayName: displayName || username,
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
        hasEmailVerificationFields = false;
      } else {
        throw error;
      }
    }

    // Add user to "The Public" organization
    try {
      await ensureUserInPublicOrganization(user.id);
    } catch (orgError: any) {
      console.error('Failed to add user to public organization:', orgError);
      // Don't fail registration if this fails - log it
      // The user can still use the system, they just won't be in the public org initially
    }

    // Session will be set on the response below

    // Send verification email only if email verification fields exist
    // (don't fail registration if email fails)
    if (hasEmailVerificationFields) {
      try {
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject: 'Verify Your Email - InterlinedList',
          html: getEmailVerificationEmailHtml(verificationToken, user.displayName || user.username),
          text: getEmailVerificationEmailText(verificationToken, user.displayName || user.username),
        });
        await logEmailSend({
          emailType: 'signup_verification',
          recipient: user.email,
          userId: user.id,
          status: 'sent',
          providerId: (result as { data?: { id?: string } })?.data?.id ?? undefined,
        });
      } catch (emailError: any) {
        console.error('Failed to send verification email:', emailError);
        await logEmailSend({
          emailType: 'signup_verification',
          recipient: user.email,
          userId: user.id,
          status: 'failed',
          errorMessage: emailError?.message ?? String(emailError),
        });
      }
    }

    // Create response
    const response = NextResponse.json(
      { message: 'User created successfully', user },
      { status: 201 }
    );

    // Set cookie directly on the response
    // This ensures the cookie is included in the response headers
    response.cookies.set(SESSION_COOKIE_NAME, user.id, {
      httpOnly: true,
      secure: APP_CONFIG.isProduction,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

