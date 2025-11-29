# Detailed Prompt Request - InterlinedList

## Original Request Summary

The user requested the creation of a micro-blogging platform similar to Mastodon, with the unique feature of embedding custom DSL scripts within posts that generate interactive lists. These lists would appear in a sidebar (left or right, configurable) alongside the main feed.

## Clarified Requirements (Based on Q&A)

### Application Type

- **Platform**: Time-series based micro-blogging application
- **Inspiration**: Mastodon-style interface and functionality
- **Unique Feature**: Embedded list creation via custom DSL scripts

### Technology Stack (Confirmed)

- **Frontend**: React
- **Hosting**: Vercel
- **Repository**: GitHub
- **Database**: PostgreSQL (TigerData)
- **Domain**: https://interlinedlist.com (already purchased and configured)

### List System Requirements

#### List Types

- **Multiple Types Supported**: The application should support various list types including:
  - Todo/Task lists
  - Shopping lists
  - Custom structured data (user-defined fields)
  - Nested/hierarchical lists

#### List Features (Confirmed)

- ✅ Checkoff functionality (mark items complete/incomplete)
- ✅ Delete list items
- ✅ Edit list items
- ✅ Nested items (sub-items within list items)
- ✅ Share lists with other users
- ✅ Collaborative editing (multiple users can edit)
- ✅ Reorder items (drag-and-drop)

#### List Sidebar Behavior

- **Content**: Shows only lists from the current authenticated user
- **Position**: Configurable left or right of main feed (via Settings)
- **Interaction**: Users can drill down into lists from the sidebar
- **Visibility**: Should be toggleable (show/hide)

### Post Features (Confirmed)

- ✅ User mentions (@username)
- ✅ Hashtags (#hashtag)
- ✅ Reply threads
- ✅ Like/favorite posts
- ✅ Bookmark posts
- ✅ Repost/share posts

### Authentication

#### Authentication Strategy

- **Requirement**: Authentication required to post and create lists
- **Implementation**: Hand-developed, bespoke authentication system built specifically for InterlinedList
- **Token Mechanism**: JWT (JSON Web Tokens) for stateless authentication
- **Session Management**: JWT access tokens with refresh tokens for extended sessions
- **Goal**: Minimize traffic back and forth, keep authentication simple for users, maintain security

#### Authentication Methods

**Primary Authentication (Bespoke)**

- Email/password registration and login
- Secure password hashing using bcrypt
- Email verification for new accounts
- Password reset functionality
- JWT-based session management

**OAuth Providers (Additional Options)**

- Google OAuth integration
- GitHub OAuth integration
- Mastodon OAuth integration (ActivityPub protocol)
- Blue Sky OAuth integration (AT Protocol)
- Extensible architecture for adding additional OAuth providers in the future

#### JWT Token Strategy

- **Access Tokens**: Short-lived (15-30 minutes) for API authentication
- **Refresh Tokens**: Long-lived (7-30 days) stored securely, used to obtain new access tokens
- **Token Storage**:
  - Option 1: HTTP-only cookies (recommended for security)
  - Option 2: Secure localStorage with automatic refresh
- **Token Refresh**: Automatic background refresh before expiration
- **Benefits**:
  - Reduces server round-trips (stateless validation)
  - Better security (short-lived access tokens)
  - Improved user experience (seamless session continuation)
  - Scalable (no server-side session storage needed)

#### Authentication Database Schema

**Users Table**

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Nullable for OAuth-only users
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

**OAuth Accounts Table**

```sql
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', 'mastodon', 'bluesky'
    provider_account_id VARCHAR(255) NOT NULL, -- Provider's user ID
    access_token TEXT, -- Encrypted OAuth access token
    refresh_token TEXT, -- Encrypted OAuth refresh token (nullable)
    expires_at TIMESTAMP, -- Token expiration (nullable)
    provider_data JSONB, -- Additional provider-specific data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider, provider_account_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_accounts_provider ON oauth_accounts(provider);
```

**Sessions Table (for JWT token tracking)**

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL, -- JWT access token identifier
    refresh_token VARCHAR(255) UNIQUE, -- Refresh token identifier
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45), -- IPv4 or IPv6
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

**Email Verification Tokens Table**

```sql
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
```

**Password Reset Tokens Table**

```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
```

#### Authentication Flow

**Registration Flow (Email/Password)**

1. User submits registration form (username, email, password)
2. Validate input (username uniqueness, email format, password strength)
3. Hash password with bcrypt
4. Create user record with `email_verified = FALSE`
5. Generate email verification token
6. Send verification email
7. User clicks verification link
8. Mark user as verified
9. Auto-login user and issue JWT tokens

**Login Flow (Email/Password)**

1. User submits login form (email/username, password)
2. Find user by email or username
3. Verify password hash
4. Generate JWT access token (short-lived)
5. Generate refresh token (long-lived)
6. Create session record
7. Return tokens to client
8. Client stores tokens securely
9. Client includes access token in API requests

**OAuth Flow (Google, GitHub, Mastodon, Blue Sky)**

1. User clicks OAuth provider button
2. Redirect to provider's authorization page
3. User authorizes application
4. Provider redirects back with authorization code
5. Exchange authorization code for access token
6. Fetch user profile from provider
7. Check if OAuth account exists in `oauth_accounts` table
8. If exists: Link to existing user account, login user
9. If not exists: Create new user account, create OAuth account record
10. Issue JWT tokens (same as email/password flow)
11. Store OAuth tokens securely in `oauth_accounts` table

**Token Refresh Flow**

1. Access token expires or is about to expire
2. Client sends refresh token to refresh endpoint
3. Validate refresh token (check database, verify not expired)
4. Generate new access token
5. Optionally rotate refresh token (security best practice)
6. Update session record
7. Return new tokens to client
8. Client updates stored tokens

**Logout Flow**

1. User clicks logout
2. Client sends logout request with access token
3. Invalidate session record (delete or mark as expired)
4. Clear tokens on client side
5. Redirect to login page

#### Security Considerations

**Password Security**

- Use bcrypt with appropriate cost factor (10-12 rounds)
- Enforce password strength requirements (min length, complexity)
- Never store plaintext passwords
- Implement password reset with time-limited tokens

**Token Security**

- Use strong, random secrets for JWT signing
- Implement token rotation for refresh tokens
- Store refresh tokens securely (encrypted in database)
- Implement token blacklisting for logout
- Set appropriate token expiration times
- Use HTTPS for all authentication endpoints

**OAuth Security**

- Store OAuth tokens encrypted in database
- Validate OAuth state parameter to prevent CSRF
- Implement proper token refresh for OAuth providers
- Handle OAuth token expiration gracefully
- Secure OAuth client secrets (environment variables)

**General Security**

- Implement rate limiting on authentication endpoints
- Log authentication attempts (success and failure)
- Implement account lockout after failed attempts
- Use CORS properly configured
- Implement CSRF protection
- Regular security audits

### Database Schema

- **Approach**: Hybrid (structured tables + PostgreSQL JSONB columns)
- **Flexibility**: JSONB used for flexible list structures and metadata
- **Structure**: Standard relational schema for core entities (users, posts, lists, list_items)

### DSL Script Details

#### Script Nature

- **Type**: Actual code/script that generates the list (not just a form or template)
- **Language**: Custom DSL/format (needs to be designed)
- **Execution**: Scripts execute to generate list structure when post is published

#### DSL Design Questions (NEEDS CLARIFICATION)

1. **DSL Syntax Format**
   - Should the DSL be markdown-like (simple, text-based)?
   - Should it be JSON/YAML structured format?
   - Should it be code-like with functions/commands?
   - **Status**: User indicated "I need help defining this" - requires design work

2. **DSL Execution Model**
   - Should scripts execute client-side (in browser) or server-side?
   - What happens if script execution fails?
   - Can scripts be edited after post creation?
   - Should there be a preview mode before publishing?

3. **DSL Capabilities**
   - What operations should the DSL support?
   - Can DSL scripts reference external data?
   - Should DSL support variables and logic?
   - Can DSL scripts create multiple lists in one post?

4. **DSL Security**
   - How should scripts be sandboxed?
   - What limits should be placed on script execution?
   - Should scripts have access to user data or other posts?

## Technical Considerations

### Post-List Relationship

**Questions to Resolve:**

1. Can one post embed multiple lists, or is it one list per post?
2. Can lists be updated after the post is created, or are they immutable?
3. If a list is updated, should the post show the updated version or original?
4. Can lists exist independently of posts (created outside of posts)?
5. Should lists be deletable, and if so, what happens to the post?

**Recommendations:**

- Allow one list per post for simplicity (can be extended later)
- Lists should be updatable after creation
- Posts should always show the current state of the list
- Lists can exist independently (created via sidebar "New List" button)
- Deleting a list should remove it from sidebar but keep post (with broken list reference, or remove list from post)

### Sidebar Interaction Details

**Questions to Resolve:**

1. When user clicks a list in sidebar, what happens?
   - Opens in modal/overlay?
   - Opens in new page/route?
   - Expands inline in sidebar?
   - Replaces main feed view?

2. Should sidebar show:
   - All lists user has created?
   - All lists user has access to (including shared)?
   - Recently viewed lists?
   - Filtered/searchable list of lists?

3. How should list creation work?
   - Only via DSL in posts?
   - Also via "New List" button in sidebar?
   - Both methods?

**Recommendations:**

- Clicking list opens detail view (could be modal or replace feed temporarily)
- Sidebar shows all lists user has created (can filter/search)
- List creation available both via DSL in posts and "New List" button

### DSL Script Embedding

**Questions to Resolve:**

1. How should DSL scripts be embedded in posts?
   - Special code block syntax: `list ... `?
   - Special marker: [LIST] ... [/LIST]?
   - Separate section in post editor?
   - Inline syntax mixed with text?

2. Should posts show:
   - The DSL script code?
   - The rendered list preview?
   - Both (code + preview)?

3. Can posts have both regular content and DSL scripts?
   - Yes, mixed together?
   - Separate sections?

**Recommendations:**

- Use code block syntax: `list ... ` for clarity
- Show rendered list preview in feed (with option to view DSL code)
- Posts can have regular content + embedded DSL script

### List Sharing & Collaboration

**Questions to Resolve:**

1. What sharing options should lists have?
   - Public (anyone can view)
   - Private (only creator)
   - Unlisted (accessible via link)
   - Shared with specific users

2. For collaborative editing:
   - Real-time (WebSocket) or eventual consistency?
   - Conflict resolution strategy?
   - Permission levels (viewer, editor, owner)?

3. Should shared lists appear in collaborator's sidebar?
   - Yes, always
   - Yes, if they have edit permissions
   - No, only in creator's sidebar

**Recommendations:**

- Support public/private/unlisted/shared-with-users
- Start with eventual consistency (real-time in Phase 2)
- Shared lists appear in sidebar if user has edit permissions

## Implementation Priorities

### Phase 1: Core Functionality (MVP)

1. **Authentication System** (See detailed authentication section above)
   - Hand-developed bespoke authentication with JWT tokens
   - Email/password registration and login
   - OAuth integration (Google, GitHub, Mastodon, Blue Sky)
   - JWT access tokens and refresh tokens
   - Session management via database
   - Protected routes and API endpoints

2. **Basic Post Feed**
   - Post creation and display
   - Chronological feed
   - Basic post interactions (like, bookmark)

3. **Simple List System**
   - Create lists via DSL (basic DSL)
   - Display lists in sidebar
   - Basic list item operations (add, edit, delete, checkoff)

4. **DSL Engine (Basic)**
   - Simple DSL parser
   - Basic list generation
   - Script execution

### Phase 2: Enhanced Features

1. **Advanced Post Features**
   - Mentions, hashtags
   - Reply threads
   - Reposts

2. **Advanced List Features**
   - Nested items
   - Reordering (drag-and-drop)
   - List sharing

3. **DSL Enhancements**
   - More DSL capabilities
   - DSL preview mode
   - DSL validation and error handling

### Phase 3: Collaboration & Polish

1. **Collaborative Editing**
   - Real-time updates
   - Conflict resolution
   - Permission management

2. **UI/UX Improvements**
   - Better styling
   - Animations
   - Mobile responsiveness

3. **Performance Optimization**
   - Caching
   - Query optimization
   - Bundle size optimization

## DSL Design Proposal

### Option 1: Markdown-like Syntax (Simple)

````
```list
type: todo
title: My Todo List
items:
  - Buy groceries
  - Finish project
  - Call mom
````

```

**Pros:**
- Easy to read and write
- Familiar to users (markdown-like)
- Simple to parse

**Cons:**
- Limited expressiveness
- Hard to represent complex structures

### Option 2: JSON/YAML Structured Format

```

```list
{
  "type": "todo",
  "title": "My Todo List",
  "items": [
    {"content": "Buy groceries", "checked": false},
    {"content": "Finish project", "checked": false},
    {"content": "Call mom", "checked": true}
  ]
}
```

```

**Pros:**
- Structured and clear
- Easy to parse (use JSON parser)
- Supports complex nested structures

**Cons:**
- More verbose
- Less "script-like" feel

### Option 3: Code-like with Functions

```

```list
list("todo", "My Todo List") {
  item("Buy groceries")
  item("Finish project")
  item("Call mom", checked: true)

  section("Work") {
    item("Review PRs")
    item("Update docs")
  }
}
```

```

**Pros:**
- More expressive
- Feels like actual code
- Supports logic and functions

**Cons:**
- More complex to parse
- Steeper learning curve
- Security concerns with execution

### Recommendation

Start with **Option 2 (JSON/YAML)** for MVP because:
- Easiest to implement securely
- Clear structure
- Easy to validate
- Can evolve to Option 3 later if needed

## Open Questions Requiring User Input

1. **DSL Syntax Preference**: Which DSL syntax option do you prefer, or do you have a different idea?

2. **List-Post Relationship**:
   - Should lists be updatable after post creation?
   - Can one post have multiple lists?
   - Can lists exist independently of posts?

3. **Sidebar Behavior**:
   - How should clicking a list in sidebar behave?
   - Should shared lists appear in sidebar?

4. **DSL Execution**:
   - Client-side or server-side execution?
   - Should there be a preview mode?

5. **List Creation Methods**:
   - Only via DSL in posts, or also via "New List" button?
   - Should there be list templates?

6. **Sharing & Privacy**:
   - What sharing options are needed?
   - Should lists have privacy settings?

## Next Steps

1. **Review this document** and provide answers to open questions
2. **Finalize DSL specification** based on preferences
3. **Create detailed technical specifications** for each component
4. **Begin implementation** starting with authentication and basic feed
5. **Iterate** based on feedback and testing

## Conclusion

This document clarifies the requirements for InterlinedList and identifies areas that need further specification, particularly around the DSL design and list-post relationships. Once these questions are answered, we can proceed with detailed technical design and implementation.

```
