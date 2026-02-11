/**
 * Shared type definitions for the InterlinedList application
 * These types are based on Prisma models and API responses
 */

/**
 * Follow status type
 */
export type FollowStatus = 'pending' | 'approved';

/**
 * Follow type matching the Prisma Follow model
 */
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  status: FollowStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  follower?: User;  // Optional, included when fetched with relation
  following?: User;  // Optional, included when fetched with relation
}

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
  messagesPerPage: number | null;
  viewingPreference: string | null;
  showPreviews: boolean | null;
  isPrivateAccount?: boolean | null;
  createdAt: Date | string;
  isAdministrator?: boolean;
  followerCount?: number;  // Optional, included when counts are fetched
  followingCount?: number;  // Optional, included when counts are fetched
  pendingRequestsCount?: number;  // Optional, included when counts are fetched
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
 * Link metadata structure for message links
 */
export interface LinkMetadataItem {
  url: string;
  platform: 'instagram' | 'bluesky' | 'threads' | 'mastodon' | 'other';
  metadata?: {
    thumbnail?: string;
    title?: string;
    description?: string;
    text?: string; // For quote/rethread/repost content
    type: 'image' | 'quote' | 'rethread' | 'repost' | 'link';
  };
  fetchedAt?: string;
  fetchStatus: 'pending' | 'success' | 'failed';
}

export interface LinkMetadata {
  links: LinkMetadataItem[];
}

/**
 * Message type matching Prisma Message model with user relation
 */
export interface Message {
  id: string;
  content: string;
  publiclyVisible: boolean;
  linkMetadata?: LinkMetadata | null;
  imageUrls?: string[] | null;
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

/**
 * List type matching the Prisma List model
 */
export interface List {
  id: string;
  userId: string;
  messageId: string | null;
  parentId: string | null;
  title: string;
  description: string | null;
  isPublic?: boolean;
  metadata: any | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt: Date | string | null;
  parent?: List | null;
  children?: List[];
}

/**
 * Organization role type
 */
export type OrganizationRole = 'owner' | 'admin' | 'member';

/**
 * Organization type matching the Prisma Organization model
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  isPublic: boolean;
  isSystem: boolean;
  settings: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt: Date | string | null;
  members?: UserOrganization[];  // Optional, included when fetched with relation
}

/**
 * UserOrganization type matching the Prisma UserOrganization model
 */
export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  joinedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: User;  // Optional, included when fetched with relation
  organization?: Organization;  // Optional, included when fetched with relation
}

