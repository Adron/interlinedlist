// Post type definitions

import type { User } from './user';

export interface Post {
  id: string;
  userId: string;
  content: string;
  dslScript?: string;
  replyToId?: string;
  repostOfId?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  replyTo?: Post;
  repostOf?: Post;
  _count?: {
    likes: number;
    bookmarks: number;
    reposts: number;
    replies: number;
  };
  userInteractions?: {
    liked: boolean;
    bookmarked: boolean;
    reposted: boolean;
  };
  mentions?: PostMention[];
  hashtags?: PostHashtag[];
}

export interface PostInteraction {
  id: string;
  postId: string;
  userId: string;
  interactionType: 'LIKE' | 'BOOKMARK' | 'REPOST';
  createdAt: Date;
}

export interface PostMention {
  id: string;
  postId: string;
  mentionedUserId: string;
  createdAt: Date;
  mentionedUser?: {
    id: string;
    username: string;
  };
}

export interface PostHashtag {
  id: string;
  postId: string;
  hashtag: string;
  createdAt: Date;
}

export interface FeedResponse {
  posts: Post[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface RepliesResponse {
  replies: Post[];
  nextCursor?: string;
  hasMore: boolean;
}
