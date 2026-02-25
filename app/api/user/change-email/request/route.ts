import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resend, FROM_EMAIL } from '@/lib/email/resend';
import { logEmailSend, getResendLogParams } from '@/lib/email/log-email';
import { generateEmailVerificationToken, getEmailVerificationExpiration } from '@/lib/auth/tokens';
import {
  getEmailChangeVerificationHtml,
  getEmailChangeVerificationText,
} from '@/lib/email/templates/email-change-verification';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// Basic email format validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const newEmail = typeof body.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : '';

    if (!newEmail) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(newEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (newEmail === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'New email must be different from your current email' },
        { status: 400 }
      );
    }

    // Check if new email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already associated with another account' },
        { status: 409 }
      );
    }

    // Rate limiting: 10 min cooldown if token exists and not expired
    const userWithPending = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailChangeExpires: true },
    });

    if (userWithPending?.emailChangeExpires) {
      const expirationTime = userWithPending.emailChangeExpires.getTime();
      const now = Date.now();

      if (expirationTime > now) {
        const tokenCreatedAt = expirationTime - (24 * 60 * 60 * 1000);
        const tenMinutesAgo = now - (10 * 60 * 1000);

        if (tokenCreatedAt > tenMinutesAgo) {
          const minutesSinceCreation = Math.ceil((now - tokenCreatedAt) / (1000 * 60));
          const minutesToWait = 10 - minutesSinceCreation;

          return NextResponse.json(
            {
              error: `Please wait before requesting another verification email. You can request a new one in ${minutesToWait} minute${minutesToWait !== 1 ? 's' : ''}.`,
            },
            { status: 429 }
          );
        }
      }
    }

    const token = generateEmailVerificationToken();
    const expiration = getEmailVerificationExpiration();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        pendingEmail: newEmail,
        emailChangeToken: token,
        emailChangeExpires: expiration,
      },
    });

    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: newEmail,
        subject: 'Confirm your new email address - InterlinedList',
        html: getEmailChangeVerificationHtml(token, user.displayName || user.username),
        text: getEmailChangeVerificationText(token, user.displayName || user.username),
      });
      const logParams = getResendLogParams(result, {
        emailType: 'email_change_verification',
        fromEmail: FROM_EMAIL,
        recipient: newEmail,
        userId: user.id,
      });
      await logEmailSend(logParams);
      if (logParams.status === 'failed') {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            pendingEmail: null,
            emailChangeToken: null,
            emailChangeExpires: null,
          },
        });
        return NextResponse.json(
          { error: 'Failed to send verification email. Please try again later.' },
          { status: 500 }
        );
      }
    } catch (emailError: any) {
      console.error('Failed to send email change verification:', emailError);
      await logEmailSend({
        emailType: 'email_change_verification',
        fromEmail: FROM_EMAIL,
        recipient: newEmail,
        userId: user.id,
        status: 'failed',
        errorMessage: emailError?.message ?? String(emailError),
      });
      // Clear pending state on send failure
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pendingEmail: null,
          emailChangeToken: null,
          emailChangeExpires: null,
        },
      });
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Verification email sent successfully. Check your inbox.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Change email request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
