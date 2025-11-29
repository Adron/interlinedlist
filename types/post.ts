// Post type definitions
// Will be expanded in Phase 3

export interface Post {
  id: string;
  userId: string;
  content: string;
  dslScript?: string;
  replyToId?: string;
  repostOfId?: string;
  createdAt: Date;
  updatedAt: Date;
}
