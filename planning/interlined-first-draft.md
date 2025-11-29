# InterlinedList - First Draft Planning Document

## Executive Summary

InterlinedList is a time-series based micro-blogging platform similar to Mastodon, with a unique twist: the ability to embed custom DSL scripts within posts that generate interactive, drill-down lists. These lists exist alongside the main feed and can be positioned to the left or right of the main wall, configurable via user settings.

## Technology Stack

### Frontend

- **Framework**: React (with modern hooks and Context API)
- **State Management**: React Context API for global state, local state for component-specific data
- **Styling**: TBD (consider Tailwind CSS or styled-components)
- **Build Tool**: Vite or Create React App
- **Type Safety**: TypeScript (recommended)

### Backend & Infrastructure

- **Hosting**: Vercel (serverless functions for API endpoints)
- **Repository**: GitHub (version control and CI/CD)
- **Database**: PostgreSQL (hosted on TigerData)
- **API**: RESTful API or GraphQL (TBD)
- **Authentication**: TBD (consider NextAuth.js, Auth0, or custom JWT)

### Domain & Deployment

- **Domain**: https://interlinedlist.com (already purchased and configured in Vercel)
- **Deployment**: Automatic via Vercel on push to main branch
- **Environment**: Production, Staging (via preview deployments)

## Application Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Main Feed   │  │  List Sidebar│  │   Settings   │  │
│  │   Component  │  │   Component  │  │   Component  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────────────┐
│              Vercel Serverless Functions                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │   Auth   │  │  Posts   │  │  Lists   │  │   DSL    ││
│  │   API    │  │   API    │  │   API    │  │  Engine  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
└─────────────────────────────────────────────────────────┘
                        ↕ SQL
┌─────────────────────────────────────────────────────────┐
│            PostgreSQL Database (TigerData)               │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐            │
│  │Users │  │Posts │  │Lists │  │ListItems │            │
│  └──────┘  └──────┘  └──────┘  └──────────┘            │
└─────────────────────────────────────────────────────────┘
```

### Component Structure

```
src/
├── components/
│   ├── feed/
│   │   ├── PostFeed.tsx
│   │   ├── PostCard.tsx
│   │   ├── PostEditor.tsx
│   │   └── PostActions.tsx
│   ├── lists/
│   │   ├── ListSidebar.tsx
│   │   ├── ListView.tsx
│   │   ├── ListItem.tsx
│   │   └── ListEditor.tsx
│   ├── dsl/
│   │   ├── DSLScriptEditor.tsx
│   │   └── DSLRenderer.tsx
│   └── common/
│       ├── Header.tsx
│       ├── Settings.tsx
│       └── UserProfile.tsx
├── contexts/
│   ├── AuthContext.tsx
│   ├── FeedContext.tsx
│   └── ListContext.tsx
├── services/
│   ├── api.ts
│   ├── auth.ts
│   └── dslEngine.ts
├── utils/
│   ├── dslParser.ts
│   └── formatters.ts
└── types/
    ├── post.ts
    ├── list.ts
    └── user.ts
```

## Core Features

### 1. Micro-blogging Platform (Mastodon-style)

#### Post Feed

- **Time-series ordering**: Chronological feed showing posts from newest to oldest
- **Infinite scroll**: Load more posts as user scrolls down
- **Real-time updates**: Optional WebSocket or polling for new posts
- **Filtering**: Filter by user, hashtag, mentions, or lists

#### Post Features

- **Mentions**: @username mentions with user linking and notifications
- **Hashtags**: #hashtag support with trending and filtering
- **Replies**: Threaded reply system with nested conversations
- **Likes**: Like/favorite posts with like count display
- **Bookmarks**: Save posts for later viewing
- **Reposts**: Share/repost other users' posts with attribution

#### Post Creation

- **Rich text editor**: Markdown support or WYSIWYG editor
- **DSL script embedding**: Special syntax to embed list creation scripts
- **Media attachments**: Image uploads (future: videos, files)
- **Draft saving**: Auto-save drafts locally
- **Character limit**: Configurable (e.g., 5000 characters)

### 2. List System

#### List Types

- **Todo Lists**: Task lists with checkoff functionality
- **Shopping Lists**: Item lists with quantities and categories
- **Custom Structured Data**: User-defined fields and structure
- **Nested Lists**: Hierarchical lists with parent-child relationships

#### List Features

- **Checkoff**: Mark items as complete/incomplete
- **Delete**: Remove list items
- **Edit**: Modify list items inline
- **Nested Items**: Create sub-items within list items
- **Share**: Share lists with other users (public/private/unlisted)
- **Collaborate**: Multiple users can edit shared lists
- **Reorder**: Drag-and-drop to reorder items

#### List Sidebar

- **Position**: Configurable left or right of main feed (via Settings)
- **Visibility**: Toggle show/hide sidebar
- **Content**: Shows user's own lists (all lists created by authenticated user)
- **Filtering**: Filter lists by type, date, or search
- **Quick actions**: Create new list, open list, delete list

#### List Drill-down

- **Detail view**: Click list to open full detail view
- **Inline editing**: Edit list items without leaving feed
- **Context preservation**: Return to feed position after viewing list

### 3. Custom DSL for List Creation

#### DSL Overview

- **Purpose**: Scripts embedded in posts that generate list structures
- **Execution**: Scripts execute to create lists when post is published
- **Syntax**: Custom DSL format (to be designed - see detailed-prompt-request.md)
- **Embedding**: Special syntax markers in post content (e.g., `list ... `)

#### DSL Requirements

- **Declarative**: Define list structure and items
- **Expressive**: Support for multiple list types
- **Safe**: Sandboxed execution to prevent security issues
- **Extensible**: Allow for future list type additions

#### DSL Execution Engine

- **Parser**: Parse DSL syntax into AST (Abstract Syntax Tree)
- **Validator**: Validate DSL syntax and structure
- **Executor**: Execute DSL to generate list data structure
- **Storage**: Store generated list in database

## Database Schema (Hybrid Approach)

### Core Tables

#### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Posts Table

```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    dsl_script TEXT, -- Embedded DSL script if present
    reply_to_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    repost_of_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_reply_to_id ON posts(reply_to_id);
```

#### Lists Table

```sql
CREATE TABLE lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL, -- If embedded in post
    title VARCHAR(255) NOT NULL,
    list_type VARCHAR(50) NOT NULL, -- 'todo', 'shopping', 'custom', 'nested'
    metadata JSONB, -- Flexible structure for list-specific data
    settings JSONB, -- List settings (public/private, collaboration, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lists_user_id ON lists(user_id);
CREATE INDEX idx_lists_post_id ON lists(post_id);
CREATE INDEX idx_lists_list_type ON lists(list_type);
CREATE INDEX idx_lists_metadata ON lists USING GIN(metadata);
```

#### List Items Table

```sql
CREATE TABLE list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES list_items(id) ON DELETE CASCADE, -- For nested items
    content TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    checked BOOLEAN DEFAULT FALSE,
    metadata JSONB, -- Flexible data for item-specific fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_list_items_list_id ON list_items(list_id);
CREATE INDEX idx_list_items_parent_id ON list_items(parent_id);
CREATE INDEX idx_list_items_order ON list_items(list_id, order_index);
```

#### Post Interactions Table

```sql
CREATE TABLE post_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) NOT NULL, -- 'like', 'bookmark', 'repost'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, user_id, interaction_type)
);

CREATE INDEX idx_post_interactions_post_id ON post_interactions(post_id);
CREATE INDEX idx_post_interactions_user_id ON post_interactions(user_id);
```

#### List Collaborators Table

```sql
CREATE TABLE list_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) DEFAULT 'editor', -- 'viewer', 'editor', 'owner'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(list_id, user_id)
);

CREATE INDEX idx_list_collaborators_list_id ON list_collaborators(list_id);
CREATE INDEX idx_list_collaborators_user_id ON list_collaborators(user_id);
```

### JSONB Usage Examples

#### List Metadata (lists.metadata)

```json
{
  "category": "work",
  "tags": ["urgent", "project-alpha"],
  "due_date": "2024-12-31",
  "custom_fields": {
    "priority": "high",
    "department": "engineering"
  }
}
```

#### List Item Metadata (list_items.metadata)

```json
{
  "quantity": 2,
  "unit": "lbs",
  "category": "produce",
  "notes": "Organic preferred",
  "custom_fields": {
    "price": 4.99,
    "store": "Whole Foods"
  }
}
```

## UI/UX Considerations

### Layout

#### Default Layout (Sidebar Right)

```
┌─────────────────────────────────────────────────────────┐
│                    Header/Navigation                     │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   Main Feed  │         List Sidebar                     │
│   (Posts)    │         (User's Lists)                   │
│              │                                          │
│              │  • List 1                                │
│              │  • List 2                                │
│              │  • List 3                                │
│              │                                          │
│              │  [+ New List]                            │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

#### Settings Configuration

- **Sidebar Position**: Toggle between left/right
- **Sidebar Width**: Adjustable width (narrow/medium/wide)
- **Sidebar Visibility**: Show/hide toggle
- **Feed Preferences**: Post density, infinite scroll settings
- **Theme**: Light/dark mode (future)

### User Experience Flow

1. **User Registration/Login**
   - Sign up with email/username/password
   - Email verification (optional)
   - Profile setup

2. **Creating a Post with List**
   - User writes post content
   - User embeds DSL script using special syntax
   - Preview shows how list will appear
   - Post is published, DSL executes, list is created

3. **Viewing Feed**
   - Main feed shows posts chronologically
   - Posts with embedded lists show list preview
   - Sidebar shows user's lists
   - Click list to drill down into detail view

4. **Interacting with Lists**
   - Click list item to check off
   - Drag to reorder items
   - Click to edit inline
   - Share list via settings

## Security Considerations

### Authentication & Authorization

- **Password Security**: Bcrypt hashing with salt
- **Session Management**: Secure HTTP-only cookies or JWT tokens
- **Rate Limiting**: Prevent spam and abuse
- **CSRF Protection**: Token-based CSRF protection

### DSL Script Security

- **Sandboxing**: DSL scripts execute in isolated environment
- **Validation**: Strict validation of DSL syntax
- **Resource Limits**: Limit execution time and memory
- **No External Calls**: DSL scripts cannot make external API calls
- **Input Sanitization**: Sanitize all user inputs

### Data Privacy

- **List Privacy**: Public/private/unlisted lists
- **User Privacy**: Privacy settings for profile and posts
- **Data Encryption**: Encrypt sensitive data at rest
- **GDPR Compliance**: User data export and deletion capabilities

## Deployment Strategy

### Vercel Configuration

- **Framework Preset**: React
- **Build Command**: `npm run build`
- **Output Directory**: `build` or `dist`
- **Environment Variables**: Database connection, API keys, secrets
- **Serverless Functions**: API routes in `/api` directory

### Database Setup (TigerData)

- **Connection**: Secure connection string via environment variables
- **Migrations**: Use migration tool (e.g., node-pg-migrate, Prisma)
- **Backups**: Configure automated backups
- **Monitoring**: Set up query monitoring and alerts

### GitHub Repository Structure

```
interlinedlist/
├── .github/
│   └── workflows/
│       └── ci.yml
├── src/
│   └── [React app structure]
├── api/
│   └── [Serverless functions]
├── public/
│   └── [Static assets]
├── migrations/
│   └── [Database migrations]
├── docs/
│   └── [Documentation]
├── .env.example
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

### CI/CD Pipeline

1. **Push to GitHub**: Triggers Vercel deployment
2. **Build**: Vercel builds React app and serverless functions
3. **Deploy**: Automatic deployment to production
4. **Preview**: Pull requests get preview deployments
5. **Database Migrations**: Run migrations on deployment (or separate step)

## Performance Considerations

### Frontend Optimization

- **Code Splitting**: Lazy load components and routes
- **Image Optimization**: Use Vercel Image Optimization
- **Caching**: Browser caching for static assets
- **Bundle Size**: Monitor and optimize bundle size

### Backend Optimization

- **Database Indexing**: Proper indexes on frequently queried columns
- **Query Optimization**: Efficient queries with proper joins
- **Caching**: Redis caching for frequently accessed data (future)
- **Pagination**: Implement pagination for feeds and lists

### Scalability

- **Serverless Architecture**: Auto-scaling via Vercel
- **Database Connection Pooling**: Efficient connection management
- **CDN**: Vercel CDN for static assets
- **Load Balancing**: Handled by Vercel infrastructure

## Future Enhancements

### Phase 2 Features

- **Real-time Collaboration**: WebSocket support for live list editing
- **List Templates**: Pre-built list templates
- **Advanced DSL**: More DSL features and capabilities
- **Mobile App**: React Native mobile application
- **Notifications**: Push notifications for mentions, likes, etc.

### Phase 3 Features

- **List Analytics**: Usage statistics and insights
- **Export/Import**: Export lists to various formats
- **API Access**: Public API for third-party integrations
- **Federated Timeline**: Connect with other Mastodon instances
- **Media Support**: Video and file attachments

## Open Questions & Decisions Needed

1. **DSL Syntax Design**: Detailed syntax specification needed (see detailed-prompt-request.md)
2. **Authentication Provider**: Choose authentication solution (NextAuth.js, Auth0, custom)
3. **API Architecture**: REST vs GraphQL decision
4. **Styling Solution**: Choose CSS framework/library
5. **State Management**: Evaluate if Redux/Zustand needed beyond Context API
6. **Testing Strategy**: Unit tests, integration tests, E2E tests
7. **Monitoring & Analytics**: Error tracking, performance monitoring tools

## Next Steps

1. **Finalize DSL Specification**: Design and document DSL syntax
2. **Set Up Project Structure**: Initialize React project with TypeScript
3. **Database Setup**: Create database schema and run migrations
4. **Authentication Implementation**: Set up auth system
5. **Core Feed Development**: Build post feed and creation
6. **List System Development**: Build list creation and management
7. **DSL Engine Development**: Implement DSL parser and executor
8. **UI Polish**: Complete styling and user experience
9. **Testing**: Write and run tests
10. **Deployment**: Deploy to production and monitor

## Conclusion

InterlinedList combines the familiar micro-blogging experience of Mastodon with a unique list creation system powered by custom DSL scripts. The hybrid database approach provides flexibility while maintaining structure, and the React/Vercel/PostgreSQL stack ensures modern, scalable architecture. The key challenge will be designing and implementing the DSL system, which requires careful consideration of syntax, security, and extensibility.
