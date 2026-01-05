import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Email verification required. Please verify your email address before posting messages.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content, publiclyVisible } = body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Get user's maxMessageLength setting
    const userWithSettings = await prisma.user.findUnique({
      where: { id: user.id },
      select: { maxMessageLength: true },
    });

    const maxLength = userWithSettings?.maxMessageLength || 666;

    if (content.length > maxLength) {
      return NextResponse.json(
        { error: `Message exceeds maximum length of ${maxLength} characters` },
        { status: 400 }
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        publiclyVisible: publiclyVisible !== undefined ? Boolean(publiclyVisible) : true,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Message created successfully', data: message },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause based on authentication
    let where: any = {};

    if (user) {
      // Authenticated users see: their own messages (public or private) + all public messages
      where = {
        OR: [
          { userId: user.id }, // User's own messages
          { publiclyVisible: true }, // All public messages
        ],
      };
    } else {
      // Unauthenticated users see only public messages
      where = {
        publiclyVisible: true,
      };
    }

    // Fetch messages ordered by createdAt DESC (newest first)
    const messages = await prisma.message.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await prisma.message.count({ where });

    return NextResponse.json(
      {
        messages,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

