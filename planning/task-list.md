# InterlinedList - Detailed Task List

## Phase 1: Project Setup & Infrastructure

### 1.1 Repository & Development Environment

- [ ] Initialize GitHub repository
- [ ] Set up repository structure (README, .gitignore, LICENSE)
- [ ] Configure branch protection rules
- [ ] Set up development environment (Node.js, npm/yarn)
- [ ] Initialize React project (Vite or Create React App)
- [ ] Configure TypeScript
- [ ] Set up ESLint and Prettier
- [ ] Configure environment variables structure (.env.example)

### 1.2 Vercel Configuration

- [ ] Connect GitHub repository to Vercel
- [ ] Configure domain (interlinedlist.com) in Vercel
- [ ] Set up environment variables in Vercel dashboard
- [ ] Configure build settings
- [ ] Set up preview deployments for pull requests
- [ ] Test deployment pipeline

### 1.3 Database Setup (TigerData PostgreSQL)

- [ ] Create PostgreSQL database instance
- [ ] Set up database connection configuration
- [ ] Create database migration system (node-pg-migrate or Prisma)
- [ ] Set up database connection pooling
- [ ] Configure database backup strategy
- [ ] Set up database monitoring

## Phase 2: Authentication System

### 2.1 Database Schema - Authentication Tables

- [ ] Create `users` table migration
  - [ ] id (UUID, primary key)
  - [ ] username (VARCHAR, unique)
  - [ ] email (VARCHAR, unique)
  - [ ] password_hash (VARCHAR, nullable for OAuth users)
  - [ ] display_name (VARCHAR)
  - [ ] avatar_url (TEXT)
  - [ ] bio (TEXT)
  - [ ] email_verified (BOOLEAN)
  - [ ] created_at, updated_at timestamps
- [ ] Create `oauth_accounts` table migration
  - [ ] id (UUID, primary key)
  - [ ] user_id (UUID, foreign key to users)
  - [ ] provider (VARCHAR: google, github, mastodon, bluesky, etc.)
  - [ ] provider_account_id (VARCHAR)
  - [ ] access_token (TEXT, encrypted)
  - [ ] refresh_token (TEXT, encrypted, nullable)
  - [ ] expires_at (TIMESTAMP, nullable)
  - [ ] provider_data (JSONB, for provider-specific data)
  - [ ] created_at, updated_at timestamps
- [ ] Create `sessions` table migration
  - [ ] id (UUID, primary key)
  - [ ] user_id (UUID, foreign key to users)
  - [ ] token (VARCHAR, unique, indexed)
  - [ ] refresh_token (VARCHAR, unique, indexed, nullable)
  - [ ] expires_at (TIMESTAMP)
  - [ ] ip_address (VARCHAR, nullable)
  - [ ] user_agent (TEXT, nullable)
  - [ ] created_at, updated_at timestamps
- [ ] Create `email_verification_tokens` table migration
  - [ ] id (UUID, primary key)
  - [ ] user_id (UUID, foreign key to users)
  - [ ] token (VARCHAR, unique)
  - [ ] expires_at (TIMESTAMP)
  - [ ] created_at timestamp
- [ ] Create `password_reset_tokens` table migration
  - [ ] id (UUID, primary key)
  - [ ] user_id (UUID, foreign key to users)
  - [ ] token (VARCHAR, unique)
  - [ ] expires_at (TIMESTAMP)
  - [ ] created_at timestamp
- [ ] Create database indexes for authentication tables
- [ ] Write database seed script for development

### 2.2 Authentication Backend (Serverless Functions)

- [ ] Set up API route structure (`/api/auth/*`)
- [ ] Create password hashing utility (bcrypt)
- [ ] Create JWT token generation utility
- [ ] Create JWT token validation middleware
- [ ] Implement user registration endpoint
  - [ ] Validate input (username, email, password)
  - [ ] Check username/email uniqueness
  - [ ] Hash password
  - [ ] Create user record
  - [ ] Generate email verification token
  - [ ] Send verification email
- [ ] Implement email verification endpoint
- [ ] Implement login endpoint
  - [ ] Validate credentials
  - [ ] Generate JWT access token
  - [ ] Generate refresh token
  - [ ] Create session record
  - [ ] Return tokens
- [ ] Implement refresh token endpoint
  - [ ] Validate refresh token
  - [ ] Generate new access token
  - [ ] Update session
- [ ] Implement logout endpoint
  - [ ] Invalidate session
  - [ ] Clear tokens
- [ ] Implement password reset request endpoint
- [ ] Implement password reset confirmation endpoint
- [ ] Implement user profile endpoint (GET)
- [ ] Implement user profile update endpoint (PUT)
- [ ] Create authentication middleware for protected routes

### 2.3 OAuth Integration

- [ ] Set up OAuth provider configurations
  - [ ] Google OAuth setup
  - [ ] GitHub OAuth setup
  - [ ] Mastodon OAuth setup (ActivityPub)
  - [ ] Blue Sky OAuth setup (AT Protocol)
- [ ] Create OAuth callback handler
- [ ] Implement OAuth account linking
- [ ] Implement OAuth account unlinking
- [ ] Create OAuth provider abstraction layer
- [ ] Handle OAuth user creation flow
- [ ] Handle OAuth user login flow
- [ ] Store OAuth tokens securely
- [ ] Implement token refresh for OAuth providers

### 2.4 Authentication Frontend

- [ ] Create AuthContext provider
- [ ] Create authentication hooks (useAuth, useSession)
- [ ] Create login page component
  - [ ] Email/password form
  - [ ] OAuth provider buttons
  - [ ] Error handling
  - [ ] Loading states
- [ ] Create registration page component
  - [ ] Registration form
  - [ ] Password strength indicator
  - [ ] Terms of service checkbox
  - [ ] Error handling
- [ ] Create password reset page
- [ ] Create email verification page
- [ ] Create protected route wrapper component
- [ ] Implement token storage (httpOnly cookies or secure localStorage)
- [ ] Implement automatic token refresh
- [ ] Create logout functionality
- [ ] Add authentication state persistence

## Phase 3: Core Post Feed System

### 3.1 Database Schema - Posts

- [ ] Create `posts` table migration
  - [ ] id (UUID, primary key)
  - [ ] user_id (UUID, foreign key to users)
  - [ ] content (TEXT)
  - [ ] dsl_script (TEXT, nullable)
  - [ ] reply_to_id (UUID, nullable, foreign key to posts)
  - [ ] repost_of_id (UUID, nullable, foreign key to posts)
  - [ ] created_at, updated_at timestamps
- [ ] Create `post_interactions` table migration
  - [ ] id (UUID, primary key)
  - [ ] post_id (UUID, foreign key to posts)
  - [ ] user_id (UUID, foreign key to users)
  - [ ] interaction_type (VARCHAR: like, bookmark, repost)
  - [ ] created_at timestamp
  - [ ] Unique constraint on (post_id, user_id, interaction_type)
- [ ] Create `post_mentions` table migration
  - [ ] id (UUID, primary key)
  - [ ] post_id (UUID, foreign key to posts)
  - [ ] mentioned_user_id (UUID, foreign key to users)
  - [ ] created_at timestamp
- [ ] Create `post_hashtags` table migration
  - [ ] id (UUID, primary key)
  - [ ] post_id (UUID, foreign key to posts)
  - [ ] hashtag (VARCHAR, indexed)
  - [ ] created_at timestamp
- [ ] Create database indexes for posts tables
- [ ] Create database views for post aggregations (like counts, etc.)

### 3.2 Post Backend API

- [ ] Create posts API routes (`/api/posts/*`)
- [ ] Implement create post endpoint
  - [ ] Validate authentication
  - [ ] Validate post content
  - [ ] Extract mentions and hashtags
  - [ ] Parse DSL script if present
  - [ ] Create post record
  - [ ] Create mention records
  - [ ] Create hashtag records
  - [ ] Execute DSL script if present (create list)
  - [ ] Return created post
- [ ] Implement get post feed endpoint
  - [ ] Pagination support
  - [ ] Chronological ordering
  - [ ] Include user data
  - [ ] Include interaction counts
  - [ ] Include user's interactions
- [ ] Implement get single post endpoint
- [ ] Implement update post endpoint
- [ ] Implement delete post endpoint
- [ ] Implement like post endpoint
- [ ] Implement unlike post endpoint
- [ ] Implement bookmark post endpoint
- [ ] Implement unbookmark post endpoint
- [ ] Implement repost endpoint
- [ ] Implement unrepost endpoint
- [ ] Implement get replies endpoint
- [ ] Create post validation utilities

### 3.3 Post Frontend Components

- [ ] Create FeedContext provider
- [ ] Create PostFeed component
  - [ ] Infinite scroll
  - [ ] Loading states
  - [ ] Error handling
  - [ ] Empty state
- [ ] Create PostCard component
  - [ ] Post content display
  - [ ] User info display
  - [ ] Timestamp formatting
  - [ ] Interaction buttons
  - [ ] Reply indicator
- [ ] Create PostEditor component
  - [ ] Rich text editor (or markdown)
  - [ ] Character counter
  - [ ] DSL script editor section
  - [ ] Preview mode
  - [ ] Draft saving
  - [ ] Submit handler
- [ ] Create PostActions component
  - [ ] Like button
  - [ ] Bookmark button
  - [ ] Repost button
  - [ ] Reply button
  - [ ] Share button
- [ ] Create PostDetail component (for single post view)
- [ ] Create ReplyThread component
- [ ] Implement mention autocomplete
- [ ] Implement hashtag linking
- [ ] Create post formatting utilities

## Phase 4: List System

### 4.1 Database Schema - Lists

- [ ] Create `lists` table migration
  - [ ] id (UUID, primary key)
  - [ ] user_id (UUID, foreign key to users)
  - [ ] post_id (UUID, nullable, foreign key to posts)
  - [ ] title (VARCHAR)
  - [ ] list_type (VARCHAR: todo, shopping, custom, nested)
  - [ ] metadata (JSONB)
  - [ ] settings (JSONB: privacy, collaboration settings)
  - [ ] created_at, updated_at timestamps
- [ ] Create `list_items` table migration
  - [ ] id (UUID, primary key)
  - [ ] list_id (UUID, foreign key to lists)
  - [ ] parent_id (UUID, nullable, foreign key to list_items)
  - [ ] content (TEXT)
  - [ ] order_index (INTEGER)
  - [ ] checked (BOOLEAN)
  - [ ] metadata (JSONB)
  - [ ] created_at, updated_at timestamps
- [ ] Create `list_collaborators` table migration
  - [ ] id (UUID, primary key)
  - [ ] list_id (UUID, foreign key to lists)
  - [ ] user_id (UUID, foreign key to users)
  - [ ] permission_level (VARCHAR: viewer, editor, owner)
  - [ ] created_at timestamp
  - [ ] Unique constraint on (list_id, user_id)
- [ ] Create database indexes for lists tables
- [ ] Create database functions for list operations

### 4.2 List Backend API

- [ ] Create lists API routes (`/api/lists/*`)
- [ ] Implement create list endpoint
  - [ ] Validate authentication
  - [ ] Validate list data
  - [ ] Create list record
  - [ ] Create list items
  - [ ] Return created list
- [ ] Implement get user lists endpoint
  - [ ] Filter by user
  - [ ] Include collaboration lists
  - [ ] Pagination support
- [ ] Implement get single list endpoint
  - [ ] Check permissions
  - [ ] Include list items
  - [ ] Include collaborator info
- [ ] Implement update list endpoint
- [ ] Implement delete list endpoint
- [ ] Implement create list item endpoint
- [ ] Implement update list item endpoint
- [ ] Implement delete list item endpoint
- [ ] Implement reorder list items endpoint
- [ ] Implement toggle item checked endpoint
- [ ] Implement share list endpoint
- [ ] Implement add collaborator endpoint
- [ ] Implement remove collaborator endpoint
- [ ] Implement update collaborator permissions endpoint
- [ ] Create list permission checking utilities

### 4.3 List Frontend Components

- [ ] Create ListContext provider
- [ ] Create ListSidebar component
  - [ ] List of user's lists
  - [ ] Filter/search functionality
  - [ ] Create new list button
  - [ ] List item click handler
  - [ ] Position configuration (left/right)
  - [ ] Show/hide toggle
- [ ] Create ListView component
  - [ ] List header
  - [ ] List items display
  - [ ] Nested items rendering
  - [ ] Empty state
- [ ] Create ListItem component
  - [ ] Item content display
  - [ ] Checkbox for checkoff
  - [ ] Edit mode
  - [ ] Delete button
  - [ ] Drag handle for reordering
- [ ] Create ListEditor component
  - [ ] List title editor
  - [ ] List type selector
  - [ ] List items editor
  - [ ] Add item functionality
  - [ ] Nested item support
- [ ] Create ListDetail component (drill-down view)
- [ ] Create ListShareModal component
- [ ] Implement drag-and-drop for reordering
- [ ] Create list formatting utilities

## Phase 5: DSL Engine

### 5.1 DSL Specification

- [ ] Finalize DSL syntax specification
- [ ] Create DSL grammar definition
- [ ] Document DSL with examples
- [ ] Create DSL validation rules

### 5.2 DSL Parser

- [ ] Create DSL parser module
- [ ] Implement JSON/YAML parsing
- [ ] Implement syntax validation
- [ ] Implement error reporting
- [ ] Create parser tests

### 5.3 DSL Executor

- [ ] Create DSL execution engine
- [ ] Implement list generation from DSL
- [ ] Implement sandboxing/security
- [ ] Implement execution time limits
- [ ] Implement error handling
- [ ] Create executor tests

### 5.4 DSL Frontend Integration

- [ ] Create DSLScriptEditor component
  - [ ] Syntax highlighting
  - [ ] Validation feedback
  - [ ] Preview mode
- [ ] Create DSLRenderer component
  - [ ] Render list from DSL
  - [ ] Show DSL code option
- [ ] Integrate DSL editor into PostEditor
- [ ] Create DSL preview functionality

## Phase 6: Settings & User Preferences

### 6.1 Database Schema - Settings

- [ ] Create `user_settings` table migration
  - [ ] id (UUID, primary key)
  - [ ] user_id (UUID, foreign key to users, unique)
  - [ ] sidebar_position (VARCHAR: left, right)
  - [ ] sidebar_width (VARCHAR: narrow, medium, wide)
  - [ ] sidebar_visible (BOOLEAN)
  - [ ] theme (VARCHAR: light, dark)
  - [ ] feed_preferences (JSONB)
  - [ ] notification_preferences (JSONB)
  - [ ] created_at, updated_at timestamps

### 6.2 Settings Backend API

- [ ] Create settings API routes (`/api/settings/*`)
- [ ] Implement get user settings endpoint
- [ ] Implement update user settings endpoint
- [ ] Create default settings on user creation

### 6.3 Settings Frontend

- [ ] Create Settings component
- [ ] Create sidebar position selector
- [ ] Create sidebar width selector
- [ ] Create sidebar visibility toggle
- [ ] Create theme selector
- [ ] Create feed preferences panel
- [ ] Create notification preferences panel
- [ ] Implement settings persistence
- [ ] Apply settings to UI components

## Phase 7: Advanced Features

### 7.1 Mentions & Hashtags

- [ ] Implement mention extraction from post content
- [ ] Create mention notification system
- [ ] Implement hashtag extraction
- [ ] Create hashtag trending algorithm
- [ ] Create hashtag search/filter
- [ ] Create mention autocomplete in editor

### 7.2 Notifications

- [ ] Create `notifications` table migration
- [ ] Create notification API endpoints
- [ ] Create notification service
- [ ] Create notification frontend component
- [ ] Implement real-time notifications (WebSocket or polling)

### 7.3 Search

- [ ] Create search API endpoint
- [ ] Implement full-text search for posts
- [ ] Implement list search
- [ ] Implement user search
- [ ] Create search frontend component

## Phase 8: Testing & Quality Assurance

### 8.1 Unit Tests

- [ ] Set up testing framework (Jest, Vitest)
- [ ] Write authentication utility tests
- [ ] Write DSL parser tests
- [ ] Write DSL executor tests
- [ ] Write API endpoint tests
- [ ] Write component tests

### 8.2 Integration Tests

- [ ] Write authentication flow tests
- [ ] Write post creation flow tests
- [ ] Write list creation flow tests
- [ ] Write DSL execution flow tests

### 8.3 E2E Tests

- [ ] Set up E2E testing (Playwright, Cypress)
- [ ] Write user registration flow
- [ ] Write login flow
- [ ] Write post creation flow
- [ ] Write list creation flow

## Phase 9: Performance & Optimization

### 9.1 Frontend Optimization

- [ ] Implement code splitting
- [ ] Optimize bundle size
- [ ] Implement image optimization
- [ ] Implement lazy loading
- [ ] Optimize re-renders
- [ ] Implement virtual scrolling for feed

### 9.2 Backend Optimization

- [ ] Optimize database queries
- [ ] Add database query caching
- [ ] Implement API response caching
- [ ] Optimize API endpoints
- [ ] Implement rate limiting

### 9.3 Database Optimization

- [ ] Review and optimize indexes
- [ ] Implement connection pooling
- [ ] Set up query monitoring
- [ ] Optimize JSONB queries

## Phase 10: Deployment & Monitoring

### 10.1 Pre-Deployment

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Set up analytics (optional)
- [ ] Set up logging
- [ ] Create deployment checklist
- [ ] Perform security audit

### 10.2 Deployment

- [ ] Deploy to production
- [ ] Verify domain configuration
- [ ] Test production environment
- [ ] Set up monitoring alerts

### 10.3 Post-Deployment

- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Gather user feedback
- [ ] Plan iterative improvements

## Phase 11: Documentation

### 11.1 User Documentation

- [ ] Create user guide
- [ ] Create DSL documentation
- [ ] Create FAQ
- [ ] Create video tutorials (optional)

### 11.2 Developer Documentation

- [ ] Create API documentation
- [ ] Create database schema documentation
- [ ] Create component documentation
- [ ] Create deployment guide
- [ ] Create contributing guide

## Notes

- Tasks are organized by phase but can be worked on in parallel where dependencies allow
- Each task should be broken down into smaller subtasks during implementation
- Regular code reviews and testing should occur throughout development
- Database migrations should be tested thoroughly before production deployment
- Security considerations should be reviewed at each phase
