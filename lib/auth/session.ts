import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, APP_CONFIG } from '@/lib/config/app';

const MAX_CACHED_ACCOUNTS = 5;

function parseSessionCookie(value: string | undefined): string[] {
  if (!value || !value.trim()) return [];
  return value.split(',').map((t) => t.trim()).filter(Boolean);
}

async function getSessionTokens(): Promise<string[]> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return parseSessionCookie(value);
}

async function setSessionCookie(tokens: string[]): Promise<void> {
  const cookieStore = await cookies();
  const value = tokens.join(',');
  cookieStore.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: APP_CONFIG.isProduction,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

const userSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatar: true,
  bio: true,
  theme: true,
  emailVerified: true,
  pendingEmail: true,
  maxMessageLength: true,
  defaultPubliclyVisible: true,
  messagesPerPage: true,
  viewingPreference: true,
  showPreviews: true,
  showAdvancedPostSettings: true,
  latitude: true,
  longitude: true,
  isPrivateAccount: true,
  cleared: true,
  githubDefaultRepo: true,
  customerStatus: true,
  stripeCustomerId: true,
  createdAt: true,
} as const;

async function getUserFromSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: userSelect } },
  });
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  return session.user;
}

async function getUserWithFallbacks(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
    if (!user) return null;

    let isAdministrator = false;
    try {
      const admin = await prisma.administrator.findUnique({
        where: { userId: user.id },
      });
      isAdministrator = !!admin;
    } catch (error: any) {
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        isAdministrator = false;
      } else {
        throw error;
      }
    }
    return { ...user, isAdministrator };
  } catch (error) {
    return null;
  }
}

/**
 * Create a session for a user. If existing cookies have tokens, merge (prepend new, limit to MAX_CACHED_ACCOUNTS).
 * Returns the cookie value to set on the response. Caller must set it (e.g. response.cookies.set(...)).
 */
export async function createSession(userId: string, existingTokens?: string[]): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });

  const tokens = existingTokens ?? (await getSessionTokens());
  const existingSessions: { token: string; userId: string }[] = [];
  for (const t of tokens) {
    const s = await prisma.session.findUnique({
      where: { id: t },
      select: { userId: true, expiresAt: true },
    });
    if (s && s.expiresAt >= new Date()) {
      existingSessions.push({ token: t, userId: s.userId });
    }
  }

  const seen = new Set<string>([userId]);
  const merged: string[] = [session.id];
  for (const { token, userId: uid } of existingSessions) {
    if (seen.has(uid)) continue;
    seen.add(uid);
    merged.push(token);
    if (merged.length >= MAX_CACHED_ACCOUNTS) break;
  }

  return merged.join(',');
}

/** Cookie options for session - use when setting cookie on response */
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: APP_CONFIG.isProduction,
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE,
    path: '/',
  };
}

/**
 * Get the current user from session
 */
export async function getCurrentUser() {
  try {
  const tokens = await getSessionTokens();
  const validTokens: string[] = [];
  let user: Awaited<ReturnType<typeof getUserFromSession>> = null;

  for (const token of tokens) {
    const u = await getUserFromSession(token);
    if (u) {
      validTokens.push(token);
      if (!user) user = u;
    } else {
      await prisma.session.deleteMany({ where: { id: token } }).catch(() => {});
    }
  }

  // Legacy cookie migration: single value that looks like userId (not a Session id)
  if (!user && tokens.length === 1) {
    const legacyUser = await getUserWithFallbacks(tokens[0]);
    if (legacyUser) {
      const newCookieValue = await createSession(legacyUser.id, []);
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, newCookieValue, getSessionCookieOptions());
      user = legacyUser;
      return addIsAdministrator(user);
    }
  }

  if (validTokens.length !== tokens.length) {
    await setSessionCookie(validTokens);
  }

  if (!user) return null;

  return addIsAdministrator(user);
  } catch (err: any) {
  console.error('getCurrentUser error:', err);
  return null;
  }
}

async function addIsAdministrator(user: NonNullable<Awaited<ReturnType<typeof getUserFromSession>>>) {
  try {
    let isAdministrator = false;
    try {
      const admin = await prisma.administrator.findUnique({
        where: { userId: user.id },
      });
      isAdministrator = !!admin;
    } catch (error: any) {
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        isAdministrator = false;
      } else {
        throw error;
      }
    }
    return { ...user, isAdministrator };
  } catch (error: any) {
    if (error?.message?.includes('isPrivateAccount') || error?.code === 'P2022') {
      const u = await getUserWithFallbacks(user.id);
      return u ? { ...u, isAdministrator: !!u?.isAdministrator } : null;
    }
    if (error?.message?.includes('maxMessageLength') || error?.code === 'P2021') {
      const u = await getUserWithFallbacks(user.id);
      return u ? { ...u, isAdministrator: !!u?.isAdministrator } : null;
    }
    throw error;
  }
}

/**
 * Switch active session to the given user
 */
export async function switchSession(targetUserId: string): Promise<boolean> {
  const tokens = await getSessionTokens();
  const sessionMap = new Map<string, string>();
  for (const token of tokens) {
    const s = await prisma.session.findUnique({
      where: { id: token },
      select: { userId: true, expiresAt: true },
    });
    if (s && s.expiresAt >= new Date()) {
      sessionMap.set(s.userId, token);
    }
  }

  const targetToken = sessionMap.get(targetUserId);
  if (!targetToken) return false;

  const reordered = [targetToken, ...tokens.filter((t) => t !== targetToken)];
  await setSessionCookie(reordered);
  return true;
}

/**
 * Remove user from cached accounts
 */
export async function removeSession(userId: string): Promise<void> {
  const tokens = await getSessionTokens();
  const toKeep: string[] = [];
  for (const token of tokens) {
    const s = await prisma.session.findUnique({
      where: { id: token },
      select: { userId: true },
    });
    if (s && s.userId !== userId) {
      toKeep.push(token);
    } else if (s) {
      await prisma.session.delete({ where: { id: token } }).catch(() => {});
    }
  }
  await setSessionCookie(toKeep);
}

/**
 * Get cached accounts for the dropdown
 */
export async function getCachedAccounts(): Promise<
  { id: string; username: string; displayName: string | null; avatar: string | null }[]
> {
  const tokens = await getSessionTokens();
  const accounts: { id: string; username: string; displayName: string | null; avatar: string | null }[] = [];
  for (const token of tokens) {
    const s = await prisma.session.findUnique({
      where: { id: token },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
    if (s && s.expiresAt >= new Date() && s.user) {
      accounts.push({
        id: s.user.id,
        username: s.user.username,
        displayName: s.user.displayName,
        avatar: s.user.avatar,
      });
    }
  }
  return accounts;
}

/**
 * Delete the current session (logout current only)
 */
export async function deleteSession(): Promise<void> {
  const tokens = await getSessionTokens();
  const first = tokens[0];
  if (first) {
    await prisma.session.delete({ where: { id: first } }).catch(() => {});
    const rest = tokens.slice(1);
    if (rest.length > 0) {
      await setSessionCookie(rest);
    } else {
      await clearSessionCookie();
    }
  } else {
    await clearSessionCookie();
  }
}

/**
 * Delete all sessions (logout all accounts)
 */
export async function deleteAllSessions(): Promise<void> {
  const tokens = await getSessionTokens();
  for (const token of tokens) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {});
  }
  await clearSessionCookie();
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
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return false;
    }
    throw error;
  }
}
