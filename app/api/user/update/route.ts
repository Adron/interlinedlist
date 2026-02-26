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
      showAdvancedPostSettings,
      latitude,
      longitude,
      isPrivateAccount,
      githubDefaultRepo,
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

    // Validate githubDefaultRepo if provided (owner/repo format)
    if (githubDefaultRepo !== undefined) {
      const val = githubDefaultRepo === null || githubDefaultRepo === '' ? null : String(githubDefaultRepo).trim();
      if (val !== null && !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(val)) {
        return NextResponse.json(
          { error: 'githubDefaultRepo must be in owner/repo format (e.g. octocat/Hello-World)' },
          { status: 400 }
        );
      }
    }

    // Validate latitude/longitude if provided
    if (latitude !== undefined) {
      const lat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return NextResponse.json(
          { error: 'latitude must be a number between -90 and 90' },
          { status: 400 }
        );
      }
    }
    if (longitude !== undefined) {
      const lon = typeof longitude === 'number' ? longitude : parseFloat(longitude);
      if (isNaN(lon) || lon < -180 || lon > 180) {
        return NextResponse.json(
          { error: 'longitude must be a number between -180 and 180' },
          { status: 400 }
        );
      }
    }

    // Update user
    // Try with isPrivateAccount first, fall back if column doesn't exist
    let updatedUser;
    
    const updateData: any = {
      ...(displayName !== undefined && { displayName }),
      ...(bio !== undefined && { bio }),
      ...(avatar !== undefined && { avatar }),
      ...(theme !== undefined && { theme }),
      ...(maxMessageLength !== undefined && { maxMessageLength: parseInt(maxMessageLength, 10) }),
      ...(defaultPubliclyVisible !== undefined && { defaultPubliclyVisible: Boolean(defaultPubliclyVisible) }),
      ...(messagesPerPage !== undefined && { messagesPerPage: parseInt(messagesPerPage, 10) }),
      ...(viewingPreference !== undefined && { viewingPreference }),
      ...(showPreviews !== undefined && { showPreviews: Boolean(showPreviews) }),
      ...(showAdvancedPostSettings !== undefined && { showAdvancedPostSettings: Boolean(showAdvancedPostSettings) }),
      ...(latitude !== undefined && { latitude: latitude === null ? null : (typeof latitude === 'number' ? latitude : parseFloat(latitude)) }),
      ...(longitude !== undefined && { longitude: longitude === null ? null : (typeof longitude === 'number' ? longitude : parseFloat(longitude)) }),
      ...(isPrivateAccount !== undefined && { isPrivateAccount: Boolean(isPrivateAccount) }),
      ...(githubDefaultRepo !== undefined && {
        githubDefaultRepo: githubDefaultRepo === null || githubDefaultRepo === '' ? null : String(githubDefaultRepo).trim(),
      }),
    };
    
    try {
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
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
          showAdvancedPostSettings: true,
          latitude: true,
          longitude: true,
          isPrivateAccount: true,
          githubDefaultRepo: true,
          createdAt: true,
        },
      });
    } catch (updateError: any) {
      // If isPrivateAccount column doesn't exist (in data or select), handle it
      if (updateError?.code === 'P2022' || updateError?.message?.includes('isPrivateAccount')) {
        // Build data object without isPrivateAccount
        const dataWithoutPrivateAccount: any = {
          ...(displayName !== undefined && { displayName }),
          ...(bio !== undefined && { bio }),
          ...(avatar !== undefined && { avatar }),
          ...(theme !== undefined && { theme }),
          ...(maxMessageLength !== undefined && { maxMessageLength: parseInt(maxMessageLength, 10) }),
          ...(defaultPubliclyVisible !== undefined && { defaultPubliclyVisible: Boolean(defaultPubliclyVisible) }),
          ...(messagesPerPage !== undefined && { messagesPerPage: parseInt(messagesPerPage, 10) }),
          ...(viewingPreference !== undefined && { viewingPreference }),
          ...(showPreviews !== undefined && { showPreviews: Boolean(showPreviews) }),
          ...(showAdvancedPostSettings !== undefined && { showAdvancedPostSettings: Boolean(showAdvancedPostSettings) }),
          ...(latitude !== undefined && { latitude: latitude === null ? null : (typeof latitude === 'number' ? latitude : parseFloat(latitude)) }),
          ...(longitude !== undefined && { longitude: longitude === null ? null : (typeof longitude === 'number' ? longitude : parseFloat(longitude)) }),
        };

        try {
          updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: dataWithoutPrivateAccount,
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
              showAdvancedPostSettings: true,
              latitude: true,
              longitude: true,
              createdAt: true,
            },
          });
        } catch (retryError: any) {
          throw retryError;
        }

        // Add isPrivateAccount default if it was requested but column doesn't exist
        if (isPrivateAccount !== undefined) {
          updatedUser = {
            ...updatedUser,
            isPrivateAccount: false,
          };
        }
      } else {
        throw updateError;
      }
    }

    return NextResponse.json(
      { message: 'User updated successfully', user: updatedUser },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

