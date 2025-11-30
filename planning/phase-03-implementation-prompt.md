# Phase 3 Implementation Prompt - Core Post Feed System

## Context

InterlinedList is a time-series based micro-blogging platform similar to Mastodon, with embedded DSL scripts for creating interactive lists. Phase 1 (Project Setup) and Phase 2 (Authentication System) have been completed. This prompt is for implementing Phase 3: Core Post Feed System.

## Current State

### Completed
- ✅ Next.js 16 project with TypeScript
- ✅ Prisma ORM with PostgreSQL
- ✅ Authentication system (registration, login, JWT tokens)
- ✅ User management (profiles, sessions)
- ✅ OAuth structure (token exchange pending)
- ✅ Frontend auth components (LoginForm, RegisterForm)
- ✅ AuthContext provider
- ✅ Database schema for users, sessions, OAuth accounts

### Project Structure
```
interlinedlist/
├── app/
│   ├── api/auth/          # Authentication endpoints
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   └── verify-email/     # Email verification page
├── components/auth/       # Auth components
├── contexts/             # React contexts (AuthContext)
├── lib/
│   └── auth/            # Auth utilities
├── prisma/
│   └── schema.prisma    # Database schema
└── types/               # TypeScript types
```

## Phase 3 Objectives

Implement the core post feed system including:
1. Database schema for posts, interactions, mentions, hashtags
2. Backend API endpoints for post CRUD and interactions
3. Frontend components for feed display and post creation
4. Post formatting, mentions, and hashtags

## Implementation Tasks

### Task 1: Database Schema - Posts

**File**: `prisma/schema.prisma`

Add the following models:

1. **Post Model**
   - id (UUID, @id, @default(uuid()))
   - userId (String, @map("user_id"))
   - content (String, @db.Text)
   - dslScript (String?, @map("dsl_script"), @db.Text)
   - replyToId (String?, @map("reply_to_id"))
   - repostOfId (String?, @map("repost_of_id"))
   - createdAt (DateTime, @default(now()), @map("created_at"))
   - updatedAt (DateTime, @updatedAt, @map("updated_at"))
   - Relations: user (User), replyTo (Post?), replies (Post[]), repostOf (Post?), reposts (Post[]), interactions, mentions, hashtags
   - Indexes: userId, createdAt, replyToId, repostOfId

2. **PostInteraction Model**
   - id (UUID, @id, @default(uuid()))
   - postId (String, @map("post_id"))
   - userId (String, @map("user_id"))
   - interactionType (String, @map("interaction_type")) // LIKE, BOOKMARK, REPOST
   - createdAt (DateTime, @default(now()), @map("created_at"))
   - Relations: post (Post), user (User)
   - Unique constraint: (postId, userId, interactionType)
   - Indexes: postId, userId, interactionType

3. **PostMention Model**
   - id (UUID, @id, @default(uuid()))
   - postId (String, @map("post_id"))
   - mentionedUserId (String, @map("mentioned_user_id"))
   - createdAt (DateTime, @default(now()), @map("created_at"))
   - Relations: post (Post), mentionedUser (User)
   - Indexes: postId, mentionedUserId

4. **PostHashtag Model**
   - id (UUID, @id, @default(uuid()))
   - postId (String, @map("post_id"))
   - hashtag (String, @db.VarChar(100))
   - createdAt (DateTime, @default(now()), @map("created_at"))
   - Relations: post (Post)
   - Indexes: postId, hashtag

**Important**: Also update the User model to add post relations:
- Add `posts Post[]` relation
- Add `postMentions PostMention[]` relation (as `mentionedUser`)
- Add `postInteractions PostInteraction[]` relation

**After schema update:**
- Run migration: `npx prisma migrate dev --name add_posts`
- Generate Prisma Client: `npx prisma generate`

### Task 2: Post Utilities

**Files to create:**

1. `lib/posts/validation.ts`
   - `validatePostContent(content: string): { valid: boolean; error?: string }`
   - `extractMentions(content: string): string[]` - Extract @username mentions
   - `extractHashtags(content: string): string[]` - Extract #hashtag mentions
   - `validateDSLScript(script: string): { valid: boolean; error?: string }` - Basic validation (placeholder)

2. `lib/posts/formatting.ts`
   - `formatMentions(content: string, mentions: PostMention[]): string` - Format mentions as links
   - `formatHashtags(content: string, hashtags: PostHashtag[]): string` - Format hashtags as links
   - `formatTimestamp(date: Date): string` - Format relative time

3. `lib/posts/queries.ts`
   - `getPostWithInteractions(postId: string, userId?: string)` - Get post with counts and user interactions
   - `buildFeedQuery(cursor?: string, limit?: number, userId?: string, hashtag?: string)` - Build feed query

### Task 3: API Endpoints

**Create API routes:**

1. `app/api/posts/route.ts`
   - `POST` - Create post (protected)
   - `GET` - Get feed (public, enhanced for authenticated users)

2. `app/api/posts/[id]/route.ts`
   - `GET` - Get single post
   - `PUT` - Update post (protected, ownership check)
   - `DELETE` - Delete post (protected, ownership check)

3. `app/api/posts/[id]/like/route.ts`
   - `POST` - Like post (protected)
   - `DELETE` - Unlike post (protected)

4. `app/api/posts/[id]/bookmark/route.ts`
   - `POST` - Bookmark post (protected)
   - `DELETE` - Unbookmark post (protected)

5. `app/api/posts/[id]/repost/route.ts`
   - `POST` - Repost (protected)
   - `DELETE` - Unrepost (protected)

6. `app/api/posts/[id]/replies/route.ts`
   - `GET` - Get replies to post

**Implementation requirements:**
- Use `withAuth` middleware for protected routes (example: `export const POST = withAuth(async (req) => { ... })`)
- For optional auth routes (like GET feed), use `getUserFromRequest()` to get user if authenticated
- Validate input data
- Extract mentions and hashtags on post creation/update
- Return proper error responses
- Include pagination metadata for feed endpoint
- Use cursor-based pagination
- Check post ownership before update/delete operations

### Task 4: Frontend Components

**Create components:**

1. `contexts/FeedContext.tsx`
   - Feed state management
   - Functions: loadFeed, loadMore, refreshFeed, addPost, updatePost, removePost
   - Interaction functions: likePost, unlikePost, bookmarkPost, unbookmarkPost, repost, unrepost

2. `components/posts/PostFeed.tsx`
   - Infinite scroll implementation
   - Loading states
   - Error handling
   - Empty state

3. `components/posts/PostCard.tsx`
   - Display post content
   - User info (avatar, username)
   - Timestamp
   - Interaction buttons and counts
   - Link to detail page

4. `components/posts/PostEditor.tsx`
   - Text area for content
   - Character counter
   - Mention autocomplete (@username)
   - Hashtag support
   - DSL script editor (collapsible)
   - Submit handler

5. `components/posts/PostActions.tsx`
   - Like button
   - Bookmark button
   - Repost button
   - Reply button
   - Share button
   - Optimistic updates

6. `components/posts/PostDetail.tsx`
   - Single post view
   - Reply thread
   - All interactions

7. `components/posts/ReplyThread.tsx`
   - Display replies
   - Nested reply support

### Task 5: Pages

**Create/update pages:**

1. `app/page.tsx` or `app/feed/page.tsx`
   - Main feed page
   - PostFeed component
   - PostEditor component
   - FeedContext provider
   - Protected route (redirect to login if not authenticated)

2. `app/posts/[id]/page.tsx`
   - Post detail page
   - PostDetail component
   - ReplyThread component
   - PostEditor for replies

### Task 6: Types

**Update `types/post.ts`:**

```typescript
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
```

## Implementation Guidelines

### Database
- Use Prisma migrations for schema changes
- Add proper indexes for performance
- Use cascade deletes where appropriate
- Normalize hashtags (lowercase, no special chars)

### API
- Follow RESTful conventions
- Use consistent error response format
- Implement proper pagination (cursor-based)
- Validate all inputs
- Check ownership for update/delete operations
- Use `withAuth` middleware for protected routes (wraps handler function)
- Use `getUserFromRequest()` for optional authentication (public routes that enhance for authenticated users)
- Example protected route: `export const POST = withAuth(async (req) => { const user = req.user!; ... })`
- Example optional auth: `const user = getUserFromRequest(req); if (user) { ... }`

### Frontend
- Use React hooks for state management
- Implement optimistic updates for interactions
- Use Intersection Observer for infinite scroll
- Format timestamps as relative time
- Handle loading and error states
- Make components responsive
- Use Tailwind CSS for styling

### Security
- Verify authentication for protected routes
- Verify ownership for update/delete operations
- Validate and sanitize user input
- Prevent XSS in post content
- Rate limit post creation (future enhancement)

## Testing Checklist

After implementation, verify:
- [ ] Can create a post
- [ ] Can view feed with posts
- [ ] Can like/unlike posts
- [ ] Can bookmark/unbookmark posts
- [ ] Can repost/unrepost posts
- [ ] Can reply to posts
- [ ] Can view single post detail
- [ ] Can view reply thread
- [ ] Can update own post
- [ ] Can delete own post
- [ ] Cannot update/delete others' posts
- [ ] Mentions are extracted and stored
- [ ] Hashtags are extracted and stored
- [ ] Feed pagination works
- [ ] Infinite scroll works
- [ ] Post formatting works (mentions, hashtags)

## Notes

- DSL script execution is deferred to Phase 5 - scripts are stored but not executed
- Post content is plain text initially - can be extended later
- Use cursor-based pagination for efficient infinite scroll
- All timestamps should be formatted as relative time (e.g., "2 hours ago")
- Optimistic updates improve UX for interactions
- Feed should show different data for authenticated vs unauthenticated users

## Next Steps After Phase 3

1. Test all functionality thoroughly
2. Optimize feed queries for performance
3. Add error boundaries
4. Prepare for Phase 4 (List System)
5. Prepare for Phase 5 (DSL Engine)

