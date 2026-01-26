import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      displayName, 
      bio, 
      avatar, 
      theme, 
      maxMessageLength, 
      defaultPubliclyVisible,
      messagesPerPage,
      viewingPreference,
      showPreviews,
    } = body;

    // Validate maxMessageLength if provided
    if (maxMessageLength !== undefined) {
      const maxLength = parseInt(maxMessageLength, 10);
      if (isNaN(maxLength) || maxLength < 1 || maxLength > 10000) {
        return NextResponse.json(
          { error: 'maxMessageLength must be a positive integer between 1 and 10000' },
          { status: 400 }
        );
      }
    }

    // Validate messagesPerPage if provided
    if (messagesPerPage !== undefined) {
      const messagesPerPageNum = parseInt(messagesPerPage, 10);
      if (isNaN(messagesPerPageNum) || messagesPerPageNum < 10 || messagesPerPageNum > 30) {
        return NextResponse.json(
          { error: 'messagesPerPage must be an integer between 10 and 30' },
          { status: 400 }
        );
      }
    }

    // Validate viewingPreference if provided
    if (viewingPreference !== undefined) {
      const validPreferences = ['my_messages', 'all_messages', 'followers_only', 'following_only'];
      if (!validPreferences.includes(viewingPreference)) {
        return NextResponse.json(
          { error: 'viewingPreference must be one of: my_messages, all_messages, followers_only, following_only' },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
        ...(theme !== undefined && { theme }),
        ...(maxMessageLength !== undefined && { maxMessageLength: parseInt(maxMessageLength, 10) }),
        ...(defaultPubliclyVisible !== undefined && { defaultPubliclyVisible: Boolean(defaultPubliclyVisible) }),
        ...(messagesPerPage !== undefined && { messagesPerPage: parseInt(messagesPerPage, 10) }),
        ...(viewingPreference !== undefined && { viewingPreference }),
        ...(showPreviews !== undefined && { showPreviews: Boolean(showPreviews) }),
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
        maxMessageLength: true,
        defaultPubliclyVisible: true,
        messagesPerPage: true,
        viewingPreference: true,
        showPreviews: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: 'User updated successfully', user: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

