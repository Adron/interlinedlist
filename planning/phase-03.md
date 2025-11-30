# Phase 3: Core Post Feed System - Implementation Plan

## Overview

Phase 3 implements the core micro-blogging functionality for InterlinedList, including post creation, feed display, interactions (likes, bookmarks, reposts), mentions, hashtags, and reply threads. This phase establishes the primary content creation and consumption experience, building upon the authentication system from Phase 2.

## Technology Decisions

- **Feed Ordering**: Chronological (time-series) ordering, newest first
- **Pagination**: Cursor-based pagination for infinite scroll
- **Content Format**: Plain text with markdown support (can be extended to rich text later)
- **DSL Scripts**: Stored as text, execution deferred to Phase 5
- **Interactions**: Database-backed with real-time counts
- **Mentions/Hashtags**: Extracted and stored separately for efficient querying

## Section 3.1: Database Schema - Posts

### 3.1.1 Prisma Schema Definition

**Tasks:**

1. Define Post model
   - id (UUID, primary key)
   - userId (UUID, foreign key to User)
   - content (TEXT, required)
   - dslScript (TEXT, nullable) - DSL script for list generation
   - replyToId (UUID, nullable, foreign key to Post) - For threaded replies
   - repostOfId (UUID, nullable, foreign key to Post) - For reposts
   - createdAt, updatedAt timestamps
   - Indexes on userId, createdAt, replyToId, repostOfId

2. Define PostInteraction model
   - id (UUID, primary key)
   - postId (UUID, foreign key to Post)
   - userId (UUID, foreign key to User)
   - interactionType (ENUM: LIKE, BOOKMARK, REPOST)
   - createdAt timestamp
   - Unique constraint on (postId, userId, interactionType)
   - Indexes on postId, userId, interactionType

3. Define PostMention model
   - id (UUID, primary key)
   - postId (UUID, foreign key to Post)
   - mentionedUserId (UUID, foreign key to User)
   - createdAt timestamp
   - Indexes on postId, mentionedUserId

4. Define PostHashtag model
   - id (UUID, primary key)
   - postId (UUID, foreign key to Post)
   - hashtag (VARCHAR(100), lowercase, indexed)
   - createdAt timestamp
   - Indexes on postId, hashtag

**Deliverables:**

- Complete Prisma schema with all post-related models
- Proper relationships and constraints
- Indexes for performance optimization
- Cascade delete rules

---

### 3.1.2 Database Migration

**Tasks:**

1. Create migration for post tables

   ```bash
   npx prisma migrate dev --name add_posts
   ```

2. Verify migration files created
3. Test migration on local database
4. Generate Prisma Client
   ```bash
   npx prisma generate
   ```

5. Create database views for aggregations (optional)
   - Post interaction counts view
   - Post reply counts view

**Deliverables:**

- Migration files in `prisma/migrations/`
- Prisma Client generated with new models
- Database tables created
- Optional aggregation views

---

## Section 3.2: Post Backend API (Serverless Functions)

### 3.2.1 Post Utilities

**Tasks:**

1. Create post validation utilities (`lib/posts/validation.ts`)
   - `validatePostContent()` - Validate content length, format
   - `extractMentions()` - Extract @username mentions from content
   - `extractHashtags()` - Extract #hashtag mentions from content
   - `validateDSLScript()` - Basic DSL script validation (placeholder for Phase 5)

2. Create post formatting utilities (`lib/posts/formatting.ts`)
   - `formatPostContent()` - Format content with mentions/hashtags
   - `parseMentions()` - Parse mention syntax
   - `parseHashtags()` - Parse hashtag syntax

3. Create post query utilities (`lib/posts/queries.ts`)
   - `getPostWithInteractions()` - Get post with interaction counts
   - `getUserInteractions()` - Get user's interactions for posts
   - `buildFeedQuery()` - Build feed query with pagination

**Deliverables:**

- Post validation utilities
- Post formatting utilities
- Post query utilities

---

### 3.2.2 API Route Structure

**Tasks:**

1. Create API route directories

   ```
   app/api/posts/
   ├── route.ts              # GET (feed), POST (create)
   ├── [id]/
   │   ├── route.ts          # GET, PUT, DELETE single post
   │   ├── like/
   │   │   └── route.ts      # POST, DELETE like
   │   ├── bookmark/
   │   │   └── route.ts      # POST, DELETE bookmark
   │   ├── repost/
   │   │   └── route.ts      # POST, DELETE repost
   │   └── replies/
   │       └── route.ts      # GET replies
   ```

2. Set up route handlers with proper TypeScript types

**Deliverables:**

- API route structure created
- Route handlers scaffolded

---

### 3.2.3 Post Endpoints

**Tasks:**

1. Implement `POST /api/posts`
   - Validate authentication (protected route)
   - Validate post content (length, format)
   - Extract mentions from content
   - Extract hashtags from content
   - Validate DSL script if present (basic validation)
   - Create post record
   - Create mention records (if any)
   - Create hashtag records (if any)
   - Return created post with user data

2. Implement `GET /api/posts` (Feed)
   - Optional authentication (show user interactions if authenticated)
   - Cursor-based pagination (cursor, limit query params)
   - Chronological ordering (newest first)
   - Include user data for each post
   - Include interaction counts (likes, bookmarks, reposts, replies)
   - Include user's interactions (if authenticated)
   - Filter by user (optional userId query param)
   - Filter by hashtag (optional hashtag query param)
   - Return posts with pagination metadata

3. Implement `GET /api/posts/[id]`
   - Get single post by ID
   - Include user data
   - Include interaction counts
   - Include user's interactions (if authenticated)
   - Include reply count
   - Return post or 404

4. Implement `PUT /api/posts/[id]`
   - Validate authentication
   - Verify post ownership
   - Validate update data
   - Update post content
   - Re-extract mentions and hashtags
   - Update mention/hashtag records
   - Return updated post

5. Implement `DELETE /api/posts/[id]`
   - Validate authentication
   - Verify post ownership
   - Delete post (cascade deletes interactions, mentions, hashtags)
   - Return success

6. Implement `POST /api/posts/[id]/like`
   - Validate authentication
   - Check if like exists
   - Create like interaction
   - Return updated like count

7. Implement `DELETE /api/posts/[id]/like`
   - Validate authentication
   - Delete like interaction
   - Return updated like count

8. Implement `POST /api/posts/[id]/bookmark`
   - Validate authentication
   - Check if bookmark exists
   - Create bookmark interaction
   - Return success

9. Implement `DELETE /api/posts/[id]/bookmark`
   - Validate authentication
   - Delete bookmark interaction
   - Return success

10. Implement `POST /api/posts/[id]/repost`
    - Validate authentication
    - Check if repost exists
    - Create repost post (repostOfId = original post id)
    - Create repost interaction
    - Return created repost

11. Implement `DELETE /api/posts/[id]/repost`
    - Validate authentication
    - Find repost post
    - Delete repost post
    - Delete repost interaction
    - Return success

12. Implement `GET /api/posts/[id]/replies`
    - Get all replies to a post
    - Pagination support
    - Include user data
    - Include interaction counts
    - Return replies ordered by createdAt

**Deliverables:**

- All post endpoints implemented
- Proper error handling
- Input validation
- Security best practices (ownership checks)
- Pagination support

---

## Section 3.3: Post Frontend Components

### 3.3.1 Feed Context Provider

**Tasks:**

1. Create FeedContext (`contexts/FeedContext.tsx`)
   - Feed state management
   - Loading state
   - Error state
   - `loadFeed()` - Load initial feed
   - `loadMore()` - Load more posts (pagination)
   - `refreshFeed()` - Refresh feed
   - `addPost()` - Add new post to feed
   - `updatePost()` - Update post in feed
   - `removePost()` - Remove post from feed
   - `likePost()` - Like a post
   - `unlikePost()` - Unlike a post
   - `bookmarkPost()` - Bookmark a post
   - `unbookmarkPost()` - Unbookmark a post
   - `repost()` - Repost a post
   - `unrepost()` - Unrepost a post

2. Create `useFeed()` hook
   - Access feed context
   - Throw error if used outside provider

**Deliverables:**

- FeedContext provider
- useFeed hook
- Feed state management
- Post interaction management

---

### 3.3.2 Post Feed Components

**Tasks:**

1. Create PostFeed component (`components/posts/PostFeed.tsx`)
   - Infinite scroll implementation
   - Loading states (initial, loading more)
   - Error handling and retry
   - Empty state
   - Post list rendering
   - Scroll position management
   - Intersection Observer for pagination

2. Create PostCard component (`components/posts/PostCard.tsx`)
   - Post content display
   - User info display (avatar, username, display name)
   - Timestamp formatting (relative time)
   - Interaction buttons (like, bookmark, repost, reply)
   - Interaction counts display
   - Reply indicator
   - Repost indicator
   - Link to post detail page
   - Responsive design

3. Create PostDetail component (`components/posts/PostDetail.tsx`)
   - Single post view
   - Full post content
   - User information
   - All interactions
   - Reply thread
   - Navigation back to feed

4. Create ReplyThread component (`components/posts/ReplyThread.tsx`)
   - Display replies to a post
   - Nested reply display
   - Load more replies
   - Reply form integration

**Deliverables:**

- PostFeed component with infinite scroll
- PostCard component
- PostDetail component
- ReplyThread component
- Loading and error states
- Responsive design

---

### 3.3.3 Post Creation Components

**Tasks:**

1. Create PostEditor component (`components/posts/PostEditor.tsx`)
   - Text area for post content
   - Character counter (with limit)
   - Mention autocomplete (@username)
   - Hashtag suggestions (#hashtag)
   - DSL script editor section (collapsible)
   - Preview mode toggle
   - Draft saving (localStorage)
   - Submit handler
   - Error display
   - Loading state
   - Reply mode (pre-fill replyToId)

2. Create PostActions component (`components/posts/PostActions.tsx`)
   - Like button with count
   - Bookmark button
   - Repost button with count
   - Reply button with count
   - Share button (copy link)
   - Interaction state management
   - Optimistic updates

**Deliverables:**

- PostEditor component
- PostActions component
- Mention autocomplete
- Hashtag support
- Draft saving
- Optimistic updates

---

### 3.3.4 Post Formatting Utilities

**Tasks:**

1. Create post formatting utilities (`lib/posts/formatting.ts` or `utils/postFormatting.ts`)
   - `formatMentions()` - Convert @username to links
   - `formatHashtags()` - Convert #hashtag to links
   - `formatContent()` - Format entire post content
   - `formatTimestamp()` - Format relative/absolute time
   - `truncateContent()` - Truncate long content

2. Create mention utilities (`utils/mentions.ts`)
   - `parseMentions()` - Extract mentions from text
   - `validateMention()` - Validate username exists
   - `getMentionSuggestions()` - Get user suggestions for autocomplete

3. Create hashtag utilities (`utils/hashtags.ts`)
   - `parseHashtags()` - Extract hashtags from text
   - `normalizeHashtag()` - Normalize hashtag format
   - `getHashtagSuggestions()` - Get trending hashtags

**Deliverables:**

- Post formatting utilities
- Mention utilities
- Hashtag utilities
- Content formatting functions

---

### 3.3.5 Integration

**Tasks:**

1. Create feed page (`app/feed/page.tsx` or update `app/page.tsx`)
   - PostFeed component
   - PostEditor component
   - FeedContext provider
   - Protected route (require authentication)

2. Create post detail page (`app/posts/[id]/page.tsx`)
   - PostDetail component
   - ReplyThread component
   - PostEditor for replies
   - FeedContext integration

3. Update types (`types/post.ts`)
   - Expand Post interface
   - Add PostInteraction type
   - Add PostMention type
   - Add PostHashtag type
   - Add FeedResponse type
   - Add PostWithInteractions type

4. Integrate with AuthContext
   - Use authentication state
   - Show different UI for authenticated/unauthenticated users
   - Handle authentication errors

**Deliverables:**

- Feed page created
- Post detail page created
- Types updated
- AuthContext integration
- Protected routes

---

## Phase 3 Completion Checklist

### Database Schema

- [ ] Prisma schema with all post models
- [ ] Database migration created and tested
- [ ] Prisma Client generated
- [ ] Indexes created for performance
- [ ] Optional aggregation views created

### Backend

- [ ] Post validation utilities
- [ ] Post formatting utilities
- [ ] Post query utilities
- [ ] All API endpoints implemented
- [ ] Error handling
- [ ] Input validation
- [ ] Pagination support
- [ ] Security checks (ownership verification)

### Frontend

- [ ] FeedContext provider
- [ ] useFeed hook
- [ ] PostFeed component
- [ ] PostCard component
- [ ] PostEditor component
- [ ] PostActions component
- [ ] PostDetail component
- [ ] ReplyThread component
- [ ] Post formatting utilities
- [ ] Mention utilities
- [ ] Hashtag utilities
- [ ] Feed page
- [ ] Post detail page
- [ ] Types updated
- [ ] AuthContext integration

## Next Steps

1. **Database Setup**: Ensure database is set up and migrations can be run
2. **Testing**: Test all post creation and feed functionality
3. **Performance**: Optimize feed queries and pagination
4. **DSL Integration**: Prepare for DSL script execution (Phase 5)
5. **Phase 4**: Proceed to List System (which will integrate with posts)

## Notes

- DSL script execution is deferred to Phase 5 - scripts are stored but not executed yet
- Post content is plain text initially - can be extended to markdown/rich text later
- Mentions and hashtags are extracted and stored for efficient querying
- Interactions use database records for accurate counts and user-specific state
- Feed uses cursor-based pagination for efficient infinite scroll
- All post endpoints require authentication except GET feed (which shows different data for authenticated users)
- Post ownership is verified for update/delete operations
- Cascade deletes ensure data consistency when posts are deleted

## Dependencies

- Phase 2 (Authentication) must be completed
- Database must be set up and migrations run
- User authentication must be working

## Future Enhancements (Post-Phase 3)

- Rich text editor for post content
- Media attachments (images, videos)
- Post visibility settings (public, followers only, etc.)
- Post editing time window
- Real-time feed updates (WebSocket/polling)
- Advanced filtering and search
- Post analytics
- Content moderation tools

