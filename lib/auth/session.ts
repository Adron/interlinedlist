import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const SESSION_COOKIE_NAME = 'session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Create a session for a user
 */
export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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
          createdAt: true,
        },
      });

      return user;
    } catch (error: any) {
      // If maxMessageLength column doesn't exist, query without it
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

        // Add defaults if not in database
        return user ? { ...user, maxMessageLength: 666, defaultPubliclyVisible: false } : null;
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

