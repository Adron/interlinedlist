import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, APP_CONFIG } from '@/lib/config/app';

/**
 * Create a session for a user
 */
export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: APP_CONFIG.isProduction,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Get the current user from session
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!userId) {
    return null;
  }

  try {
    // First try to get user with maxMessageLength
    // If column doesn't exist, fall back to query without it
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
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
          createdAt: true,
        },
      });

      if (!user) {
        return null;
      }

      // Check if user is administrator (handle case where table doesn't exist yet)
      let isAdministrator = false;
      try {
        const admin = await prisma.administrator.findUnique({
          where: { userId: user.id },
        });
        isAdministrator = !!admin;
      } catch (error: any) {
        // If administrators table doesn't exist yet, user is not admin
        // This allows the app to work before migration is applied
        if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
          isAdministrator = false;
        } else {
          throw error;
        }
      }

      return {
        ...user,
        isAdministrator,
      };
    } catch (error: any) {
      // If isPrivateAccount column doesn't exist, retry query without it (but keep other fields like maxMessageLength)
      if (error?.message?.includes('isPrivateAccount') || error?.code === 'P2022') {
        const user = await prisma.user.findUnique({
          where: { id: userId },
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

        if (!user) {
          return null;
        }

        // Check if user is administrator (handle case where table doesn't exist yet)
        let isAdministrator = false;
        try {
          const admin = await prisma.administrator.findUnique({
            where: { userId: user.id },
          });
          isAdministrator = !!admin;
        } catch (error: any) {
          // If administrators table doesn't exist yet, user is not admin
          if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
            isAdministrator = false;
          } else {
            throw error;
          }
        }

        // Return user with isPrivateAccount default, but preserve actual database values for other fields
        return {
          ...user,
          isPrivateAccount: false,
          isAdministrator,
        };
      }
      // If error is about maxMessageLength or other fields, fall back to minimal query
      if (error?.message?.includes('maxMessageLength') || error?.code === 'P2021') {
        const user = await prisma.user.findUnique({
          where: { id: userId },
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

        if (!user) {
          return null;
        }

        // Check if user is administrator (handle case where table doesn't exist yet)
        let isAdministrator = false;
        try {
          const admin = await prisma.administrator.findUnique({
            where: { userId: user.id },
          });
          isAdministrator = !!admin;
        } catch (error: any) {
          // If administrators table doesn't exist yet, user is not admin
          if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
            isAdministrator = false;
          } else {
            throw error;
          }
        }

        // Add defaults if not in database
        return {
          ...user,
          maxMessageLength: 666,
          defaultPubliclyVisible: false,
          messagesPerPage: 20,
          viewingPreference: 'all_messages',
          showPreviews: true,
          showAdvancedPostSettings: false,
          latitude: null,
          longitude: null,
          isPrivateAccount: false,
          isAdministrator,
        };
      }
      throw error;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Delete the current session
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if a user is an administrator
 */
export async function isAdministrator(userId: string): Promise<boolean> {
  try {
    const admin = await prisma.administrator.findUnique({
      where: { userId },
    });
    return !!admin;
  } catch (error: any) {
    // If administrators table doesn't exist yet, user is not admin
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return false;
    }
    throw error;
  }
}

