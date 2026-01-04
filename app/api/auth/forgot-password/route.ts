import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resend, FROM_EMAIL } from '@/lib/email/resend';
import { generatePasswordResetToken, getTokenExpiration } from '@/lib/auth/tokens';
import { getPasswordResetEmailHtml, getPasswordResetEmailText } from '@/lib/email/templates/password-reset';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
      },
    });

    // Always return success to prevent email enumeration
    // If user doesn't exist, we still return success but don't send email
    if (!user) {
      return NextResponse.json(
        { message: 'If an account with that email exists, a password reset link has been sent.' },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken();
    const expiration = getTokenExpiration();

    // Store token and expiration in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: expiration,
      },
    });

    // Send email
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: 'Reset Your Password - InterlinedList',
        html: getPasswordResetEmailHtml(resetToken, user.displayName || user.username),
        text: getPasswordResetEmailText(resetToken, user.displayName || user.username),
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't fail the request if email fails - log it
      // In production, you might want to use a queue system
    }

    return NextResponse.json(
      { message: 'If an account with that email exists, a password reset link has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

