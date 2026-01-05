import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resend, FROM_EMAIL } from '@/lib/email/resend';
import { generateEmailVerificationToken, getEmailVerificationExpiration } from '@/lib/auth/tokens';
import { getEmailVerificationEmailHtml, getEmailVerificationEmailText } from '@/lib/email/templates/email-verification';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if email already verified
    const userWithStatus = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true, emailVerificationExpires: true },
    });

    if (userWithStatus?.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 200 }
      );
    }

    // Rate limiting: Check if a verification email was sent recently (within last hour)
    // If expiration exists and is in the future, check if token was created recently
    if (userWithStatus?.emailVerificationExpires) {
      const expirationTime = userWithStatus.emailVerificationExpires.getTime();
      const now = Date.now();
      
      // If token hasn't expired yet, it was created recently (within 24 hours)
      // Check if it was created within the last hour
      if (expirationTime > now) {
        // Token expiration is 24 hours from creation, so if expiration is more than 23 hours away,
        // it was created less than 1 hour ago
        const hoursUntilExpiration = (expirationTime - now) / (1000 * 60 * 60);
        if (hoursUntilExpiration > 23) {
          return NextResponse.json(
            { error: 'Please wait before requesting another verification email. You can request a new one in 1 hour.' },
            { status: 429 }
          );
        }
      }
    }

    // Generate verification token and expiration
    const verificationToken = generateEmailVerificationToken();
    const expiration = getEmailVerificationExpiration();

    // Store token and expiration in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: expiration,
      },
    });

    // Send email
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
      { message: 'Verification email sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Send verification email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

