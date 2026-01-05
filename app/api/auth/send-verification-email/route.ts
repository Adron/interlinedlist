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

    // Rate limiting: Check if a verification email was sent recently (within last 10 minutes)
    // Token expiration is 24 hours from creation, so we can calculate when it was created
    if (userWithStatus?.emailVerificationExpires) {
      const expirationTime = userWithStatus.emailVerificationExpires.getTime();
      const now = Date.now();
      
      // Only check rate limit if token hasn't expired yet
      if (expirationTime > now) {
        // Calculate when the token was created (24 hours before expiration)
        const tokenCreatedAt = expirationTime - (24 * 60 * 60 * 1000); // 24 hours in milliseconds
        const tenMinutesAgo = now - (10 * 60 * 1000); // 10 minutes in milliseconds
        
        // If token was created less than 10 minutes ago, rate limit
        if (tokenCreatedAt > tenMinutesAgo) {
          const minutesSinceCreation = Math.ceil((now - tokenCreatedAt) / (1000 * 60));
          const minutesToWait = 10 - minutesSinceCreation;
          
          return NextResponse.json(
            { error: `Please wait before requesting another verification email. You can request a new one in ${minutesToWait} minute${minutesToWait !== 1 ? 's' : ''}.` },
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

