/**
 * Shared type definitions for the InterlinedList application
 * These types are based on Prisma models and API responses
 */

/**
 * User type matching the Prisma User model (select fields)
 */
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  theme: string | null;
  emailVerified: boolean;
  maxMessageLength: number | null;
  createdAt: Date | string;
}

/**
 * Minimal user information included in messages
 */
export interface MessageUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * Message type matching Prisma Message model with user relation
 */
export interface Message {
  id: string;
  content: string;
  publiclyVisible: boolean;
  createdAt: string; // ISO string for client components
  updatedAt?: string; // ISO string, optional
  user: MessageUser;
  userId?: string; // Optional, may not be included in all queries
}

/**
 * Pagination metadata
 */
export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * API response wrapper for paginated messages
 */
export interface MessagesResponse {
  messages: Message[];
  pagination: PaginationInfo;
}

