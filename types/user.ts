// User type definitions
// Matches Prisma User model

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthAccount {
  id: string;
  userId: string;
  provider: 'google' | 'github' | 'mastodon' | 'bluesky';
  providerAccountId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  providerData?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string | null;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
