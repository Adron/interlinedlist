import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAndPublicOwner } from '@/lib/auth/admin-access';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { generateEmailVerificationToken, getEmailVerificationExpiration } from '@/lib/auth/tokens';
import { resend, FROM_EMAIL } from '@/lib/email/resend';
import { logEmailSend, getResendLogParams } from '@/lib/email/log-email';
import { getEmailVerificationEmailHtml, getEmailVerificationEmailText } from '@/lib/email/templates/email-verification';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await checkAdminAndPublicOwner();
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      username,
      password,
      displayName,
      avatar,
      bio,
      emailVerified,
      isAdministrator,
    } = body;

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

    // Generate email verification token if email is not verified
    let verificationToken: string | undefined;
    let expiration: Date | undefined;
    if (!emailVerified) {
      verificationToken = generateEmailVerificationToken();
      expiration = getEmailVerificationExpiration();
    }

    // Create user - try with email verification fields first, fall back if columns don't exist
    let createdUser;
    let hasEmailVerificationFields = false;
    try {
      const userData: any = {
        email,
        username,
        passwordHash,
        displayName: displayName || username,
        avatar: avatar || null,
        bio: bio || null,
        emailVerified: emailVerified || false,
      };

      if (verificationToken && expiration) {
        userData.emailVerificationToken = verificationToken;
        userData.emailVerificationExpires = expiration;
      }

      createdUser = await prisma.user.create({
        data: userData,
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
      hasEmailVerificationFields = !!verificationToken;
    } catch (error: any) {
      // If email verification columns don't exist, create user without them
      if (error?.code === 'P2022' && error?.meta?.column?.includes('emailVerification')) {
        createdUser = await prisma.user.create({
          data: {
            email,
            username,
            passwordHash,
            displayName: displayName || username,
            avatar: avatar || null,
            bio: bio || null,
            emailVerified: emailVerified || false,
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

    // Handle administrator status
    if (isAdministrator) {
      await prisma.administrator.create({
        data: { userId: createdUser.id },
      });
    }

    // Send verification email if email is not verified and verification fields exist
    if (!emailVerified && hasEmailVerificationFields && verificationToken) {
      try {
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: createdUser.email,
          subject: 'Verify Your Email - InterlinedList',
          html: getEmailVerificationEmailHtml(verificationToken, createdUser.displayName || createdUser.username),
          text: getEmailVerificationEmailText(verificationToken, createdUser.displayName || createdUser.username),
        });
        await logEmailSend(getResendLogParams(result, {
          emailType: 'admin_user_verification',
          fromEmail: FROM_EMAIL,
          recipient: createdUser.email,
          userId: createdUser.id,
        }));
      } catch (emailError: any) {
        console.error('Failed to send verification email:', emailError);
        await logEmailSend({
          emailType: 'admin_user_verification',
          fromEmail: FROM_EMAIL,
          recipient: createdUser.email,
          userId: createdUser.id,
          status: 'failed',
          errorMessage: emailError?.message ?? String(emailError),
        });
      }
    }

    // Check if user is administrator
    const adminRecord = await prisma.administrator.findUnique({
      where: { userId: createdUser.id },
    });

    return NextResponse.json(
      {
        user: {
          ...createdUser,
          isAdministrator: !!adminRecord,
          createdAt: createdUser.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create user error:', error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      return NextResponse.json(
        { error: `${field ? field.charAt(0).toUpperCase() + field.slice(1) : 'Field'} already in use` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await checkAdminAndPublicOwner();
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause for search
    let where: any = {};
    if (search) {
      where = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    // Fetch users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          bio: true,
          emailVerified: true,
          cleared: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    // Check which users are administrators
    const adminUserIds = new Set(
      (
        await prisma.administrator.findMany({
          select: { userId: true },
        })
      ).map((a) => a.userId)
    );

    // Add administrator flag and serialize dates
    const usersWithAdminFlag = users.map((u) => ({
      ...u,
      isAdministrator: adminUserIds.has(u.id),
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        users: usersWithAdminFlag,
        pagination: {
          total,
          limit,
          offset: skip,
          page,
          hasMore: skip + limit < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
