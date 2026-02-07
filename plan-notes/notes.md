# Markdown Notepad Feature - Implementation Plan

## Overview

Build a markdown-based notepad interface that allows users to create, edit, and manage multiple text documents. Each user can create unlimited notes/documents, with each note stored as a separate row in the database. Notes can be private or shared/public, accessible from both the left sidebar menu and user dropdown menu. The editor will use react-md-editor with auto-save functionality.

**Database Storage Model:**
- Each note is stored as an independent row in the `notes` table
- Multiple notes per user are supported via one-to-many relationship (`User` → `Note[]`)
- Notes are stored with full markdown content in PostgreSQL `TEXT` field (unlimited length)
- Each note has unique ID, title, content, visibility setting, and timestamps
- Soft delete support allows note recovery without data loss

## Requirements Summary

- **Structure**: Multiple notes per user (can create multiple notes/documents)
- **Visibility**: Notes can be private or shared/public (similar to lists)
- **Navigation**: Accessible from both left sidebar menu and user dropdown menu
- **Editor**: Basic markdown editor with preview using react-md-editor
- **Auto-save**: Auto-save with debounce (every 2-3 seconds)

## Database Schema Changes

### 1. Add Note Model to Prisma Schema

**File**: `prisma/schema.prisma`

Add a new `Note` model to support multiple documents per user:

```prisma
model Note {
  id              String   @id @default(uuid())
  userId          String
  title           String
  content         String   @db.Text  // Markdown content - use TEXT type for unlimited length
  isPublic        Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, deletedAt])
  @@index([userId, createdAt])
  @@index([isPublic])
  @@index([userId, isPublic, deletedAt])  // Composite index for user's public notes query
  @@map("notes")
}
```

**Key Schema Details:**

- **Multiple Documents Support**: Each user can have multiple notes (one-to-many relationship via `userId`)
- **Content Storage**: Uses PostgreSQL `TEXT` type (via `@db.Text`) to support unlimited content length
- **Soft Delete**: `deletedAt` field allows soft deletion (notes can be restored)
- **Public/Private**: `isPublic` boolean field controls visibility (defaults to private)
- **Timestamps**: `createdAt` and `updatedAt` track document lifecycle
- **Cascade Delete**: When a user is deleted, all their notes are automatically deleted
- **Indexes**: Optimized for common queries:
  - User's notes filtered by deletion status
  - User's notes sorted by creation date
  - Public notes lookup
  - Composite index for user's public notes queries

### 2. Update User Model

**File**: `prisma/schema.prisma`

Add the `notes` relation to the existing `User` model:

```prisma
model User {
  // ... existing fields ...
  messages             Message[]
  lists                List[]
  notes                Note[]        // Add this line
  administrator        Administrator?

  @@map("users")
}
```

**Relationship Details:**

- One user can have many notes (`notes Note[]`)
- Each note belongs to exactly one user (`userId String` with foreign key)
- Cascade delete ensures data integrity (deleting user removes all their notes)

### 3. Database Migration

**Migration File**: `prisma/migrations/[timestamp]_add_notes/migration.sql`

The migration will create:

1. **`notes` table** with:
   - `id` (UUID primary key)
   - `userId` (foreign key to users table)
   - `title` (VARCHAR/TEXT)
   - `content` (TEXT - unlimited length)
   - `isPublic` (BOOLEAN, default false)
   - `createdAt` (TIMESTAMP)
   - `updatedAt` (TIMESTAMP)
   - `deletedAt` (TIMESTAMP, nullable)

2. **Foreign key constraint**: `notes_userId_fkey` referencing `users(id)` with `ON DELETE CASCADE`

3. **Indexes**:
   - `notes_userId_deletedAt_idx` - Composite index for user's active notes
   - `notes_userId_createdAt_idx` - Composite index for sorting by date
   - `notes_isPublic_idx` - Index for public notes lookup
   - `notes_userId_isPublic_deletedAt_idx` - Composite index for user's public notes

**Migration Command:**

```bash
npm run db:migrate
```

This will:
- Generate the migration SQL file
- Apply it to the database
- Regenerate Prisma Client with the new Note model

### 4. TypeScript Type Definition

**File**: `lib/types/index.ts` (optional but recommended)

Add Note type definition:

```typescript
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  isPublic: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt: Date | string | null;
  user?: User;  // Optional, included when fetched with relation
}
```

### 5. Database Storage Considerations

**Multiple Documents Per User:**
- Each user can create unlimited notes (one-to-many relationship)
- Notes are stored as separate rows in the `notes` table
- Each note has a unique `id` (UUID) and belongs to one `userId`
- Notes are independent documents - no hierarchy or nesting (unlike Lists)
- All notes for a user are queried via `userId` foreign key

**Content Length:**
- PostgreSQL `TEXT` type supports up to ~1GB per field
- No explicit length limit needed for markdown content
- Consider adding client-side validation for reasonable limits (e.g., 1MB) for UX
- Database can handle thousands of notes per user efficiently

**Storage Optimization:**
- Indexes optimize common query patterns
- Soft delete (`deletedAt`) allows recovery without data loss
- `updatedAt` automatically updates on any change (Prisma `@updatedAt`)
- Composite indexes reduce query time for filtered searches

**Query Performance:**
- Composite indexes support efficient filtering:
  - User's notes: `WHERE userId = ? AND deletedAt IS NULL` (uses `[userId, deletedAt]` index)
  - User's public notes: `WHERE userId = ? AND isPublic = true AND deletedAt IS NULL` (uses `[userId, isPublic, deletedAt]` index)
  - Public notes: `WHERE isPublic = true AND deletedAt IS NULL` (uses `[isPublic]` index)
  - Recent notes: `ORDER BY createdAt DESC` (uses `[userId, createdAt]` index)
- Pagination prevents loading all notes at once
- Indexes ensure queries scale well even with many notes per user

**Data Integrity:**
- Foreign key constraint ensures notes always belong to valid users
- Cascade delete prevents orphaned notes (when user is deleted)
- Unique constraint on `id` ensures no duplicates
- `userId` is required (NOT NULL constraint)
- `title` and `content` are required fields

**Storage Pattern:**
- Each note is a separate database row
- No nested structure (flat table design)
- Easy to query, filter, and paginate
- Supports efficient bulk operations (delete all user's notes, etc.)
- Simple to extend with additional fields (tags, categories, etc.) in future

## API Routes

### 1. Notes List API

**File**: `app/api/notes/route.ts` (new)

- **GET**: Get all notes for the current user
  - Query params: 
    - `limit` (number, default: 20) - Number of notes per page
    - `offset` (number, default: 0) - Pagination offset
    - `page` (number, optional) - Alternative to offset (calculates offset = (page - 1) * limit)
    - `public` (boolean, optional) - Filter to only public notes
    - `includeDeleted` (boolean, optional) - Include soft-deleted notes
  - Returns paginated list of notes: `{ notes: Note[], pagination: { total, limit, offset, hasMore } }`
  - Only returns user's own notes (filtered by `userId`)
  - If `public=true`, only returns user's public notes
  - Uses database indexes for efficient querying of multiple documents
  - Supports pagination to handle users with many notes

- **POST**: Create a new note
  - Body: `{ title: string, content: string, isPublic?: boolean }`
  - Requires authentication (gets `userId` from session)
  - Creates a new note row in the database
  - Sets `userId`, `createdAt`, `updatedAt` automatically
  - Returns created note with all fields including generated `id`
  - Each POST creates a separate document (multiple notes per user)

### 2. Individual Note API

**File**: `app/api/notes/[id]/route.ts` (new)

- **GET**: Get a single note by ID
  - If note is public or user owns it, return note
  - Otherwise return 404/403

- **PUT**: Update a note
  - Body: `{ title?: string, content?: string, isPublic?: boolean }`
  - Requires authentication and ownership
  - Returns updated note

- **DELETE**: Delete a note (soft delete)
  - Requires authentication and ownership
  - Sets `deletedAt` timestamp

### 3. Public Note API

**File**: `app/api/notes/[id]/public/route.ts` (new, optional)

- **GET**: Get a public note by ID
  - No authentication required
  - Only returns if `isPublic === true`
  - Used for sharing public notes

### 4. Auto-save API

**File**: `app/api/notes/[id]/autosave/route.ts` (new, optional)

- **PATCH**: Auto-save note content
  - Body: `{ content: string }` or `{ title?: string, content?: string }`
  - Requires authentication and ownership
  - Lightweight endpoint for frequent auto-save calls
  - Returns updated note

## Query Functions

**File**: `lib/notes/queries.ts` (new)

Create utility functions for database operations. Follow the pattern used in `lib/lists/queries.ts`:

### Function Signatures and Implementation:

**1. `getUserNotes(userId: string, options?)`**
- Get all notes for a specific user with pagination
- Options: `{ limit?: number, offset?: number, page?: number, includeDeleted?: boolean }`
- Filters out soft-deleted notes by default (`deletedAt IS NULL`)
- Returns: `{ notes: Note[], pagination: { total, limit, offset, hasMore } }`
- Uses composite index `[userId, deletedAt]` for performance

**2. `getUserPublicNotes(userId: string, options?)`**
- Get public notes for a specific user
- Same pagination options as `getUserNotes`
- Filters: `userId = ? AND isPublic = true AND deletedAt IS NULL`
- Uses composite index `[userId, isPublic, deletedAt]` for performance

**3. `getNoteById(noteId: string, userId: string)`**
- Get a single note by ID with ownership verification
- Verifies `userId` matches note's `userId`
- Returns `null` if note not found, deleted, or user doesn't own it
- Used for authenticated note access

**4. `getPublicNoteById(noteId: string)`**
- Get a public note by ID (no authentication required)
- Filters: `id = ? AND isPublic = true AND deletedAt IS NULL`
- Returns `null` if note is private, deleted, or doesn't exist
- Used for public note sharing

**5. `createNote(userId: string, data: { title: string, content: string, isPublic?: boolean })`**
- Create a new note in the database
- Sets `userId`, `createdAt`, `updatedAt` automatically
- Returns created note with all fields
- Validates required fields (title, content)

**6. `updateNote(noteId: string, userId: string, data: { title?: string, content?: string, isPublic?: boolean })`**
- Update an existing note
- Verifies ownership (`userId` must match)
- Only updates provided fields (partial update)
- Automatically updates `updatedAt` timestamp
- Returns updated note or throws error if not found/unauthorized

**7. `deleteNote(noteId: string, userId: string)`**
- Soft delete a note (sets `deletedAt` timestamp)
- Verifies ownership before deletion
- Note remains in database but is filtered out of queries
- Returns deleted note or throws error if not found/unauthorized

**8. `getNotesCount(userId: string, includeDeleted?: boolean)`**
- Get total count of user's notes
- Useful for pagination calculations
- Optionally includes deleted notes

**Example Implementation Pattern:**

```typescript
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

export async function getUserNotes(
  userId: string,
  options: PaginationParams & { includeDeleted?: boolean } = {}
) {
  const { limit = 20, offset = 0, includeDeleted = false } = options;
  
  const where: Prisma.NoteWhereInput = {
    userId,
    ...(includeDeleted ? {} : { deletedAt: null }),
  };

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.note.count({ where }),
  ]);

  return {
    notes,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}
```

## Components

### 1. Markdown Editor Component

**File**: `components/notes/MarkdownEditor.tsx` (new)

Create a client component using `react-md-editor`:

- Accepts props: `value`, `onChange`, `onSave`, `loading`, `autoSave`
- Implements auto-save with debounce (2-3 second delay)
- Shows markdown preview
- Handles save button (manual save)
- Displays save status indicator

### 2. Notes List Component

**File**: `components/notes/NotesList.tsx` (new)

Display a list of user's notes:

- Shows note title, preview (first few lines), created/updated dates
- Filter by public/private
- Link to edit each note
- "Create New Note" button
- Pagination support

### 3. Note Editor Page Component

**File**: `app/notes/[id]/page.tsx` (new)

Full-page note editor:

- Uses `MarkdownEditor` component
- Shows note title (editable)
- Shows public/private toggle
- Auto-saves as user types
- Manual save button
- Delete button
- Back to notes list link

### 4. Notes List Page

**File**: `app/notes/page.tsx` (new)

Main notes page:

- Shows `NotesList` component
- "Create New Note" button at top
- Handles creating new notes (redirects to editor)

### 5. Public Note View Page

**File**: `app/notes/public/[id]/page.tsx` (new, optional)

Public note viewing page:

- Read-only view of public notes
- Renders markdown content
- No edit/delete options
- Shows note title and author info

## Navigation Updates

### 1. Left Sidebar Menu

**File**: `components/AppSidebar.tsx`

Add "Notes" menu item after "Lists":

```tsx
{/* Notes */}
{user && (
  <li className="nav-item">
    <Link className="nav-link" href="/notes">
      <span className="nav-icon">
        <i className="bx bx-note"></i>
      </span>
      <span className="nav-text">Notes</span>
    </Link>
  </li>
)}
```

### 2. User Dropdown Menu

**File**: `components/UserDropdown.tsx`

Add "Notes" link after "Settings" and before "Help":

```tsx
{/* Notes */}
<Link 
  className="dropdown-item" 
  href="/notes"
  onClick={() => setIsOpen(false)}
>
  <i className="bx bx-note align-middle me-2" style={{ fontSize: '18px' }}></i>
  <span className="align-middle">Notes</span>
</Link>
```

### 3. Sidebar User Menu

**File**: `components/AppSidebarUserMenu.tsx`

Add "Notes" link after "Settings" and before "Help":

```tsx
{/* Notes */}
<li className="nav-item">
  <Link className="nav-link" href="/notes">
    <span className="nav-icon">
      <i className="bx bx-note"></i>
    </span>
    <span className="nav-text">Notes</span>
  </Link>
</li>
```

## Dependencies

**File**: `package.json`

Add markdown editor dependency:

```json
{
  "dependencies": {
    "@uiw/react-md-editor": "^3.x.x"
  }
}
```

Also add TypeScript types if needed:

```json
{
  "devDependencies": {
    "@types/react-md-editor": "^3.x.x" // if available
  }
}
```

## Implementation Order

1. **Database Setup** (CRITICAL - Must be done first):
   - Add `Note` model to Prisma schema (`prisma/schema.prisma`)
   - Add `notes Note[]` relation to `User` model
   - Run `npm run db:migrate` to create migration and apply to database
   - Verify migration creates table, indexes, and foreign key constraints
   - Test that Prisma Client regenerates with Note model

2. Install react-md-editor dependency (`npm install @uiw/react-md-editor`)

3. Create query functions in `lib/notes/queries.ts`:
   - Implement all database query functions
   - Test queries return multiple notes per user correctly
   - Verify pagination works with many notes

4. Create API routes:
   - `/api/notes/route.ts` - List and create notes (handles multiple documents)
   - `/api/notes/[id]/route.ts` - Get, update, delete individual notes
   - Test API endpoints handle multiple notes per user

5. Create MarkdownEditor component with auto-save (`components/notes/MarkdownEditor.tsx`)

6. Create NotesList component (`components/notes/NotesList.tsx`):
   - Display multiple notes in a list
   - Support pagination for users with many notes

7. Create notes list page (`app/notes/page.tsx`):
   - Shows all user's notes
   - Create new note functionality

8. Create note editor page (`app/notes/[id]/page.tsx`):
   - Edit individual notes
   - Auto-save to database

9. Update navigation components:
   - Add Notes link to `AppSidebar.tsx`
   - Add Notes link to `AppSidebarUserMenu.tsx`
   - Add Notes link to `UserDropdown.tsx`

10. Test multiple documents:
    - Create multiple notes per user
    - Verify all notes are stored separately in database
    - Test pagination with many notes
    - Test filtering and searching

11. Test auto-save functionality

12. Test public note sharing (optional)

## Auto-save Implementation Details

- Use `useDebounce` hook or `setTimeout` with cleanup
- Debounce delay: 2-3 seconds
- Show save status indicator (saving/saved/error)
- Only auto-save if content has changed
- Handle network errors gracefully
- Optionally use a separate lightweight auto-save endpoint

## Edge Cases to Handle

- Empty notes (no title/content)
- Very long notes (consider content length limits)
- Concurrent editing (last save wins)
- Network failures during auto-save
- Public note access without authentication
- Note deletion (soft delete, can be restored)
- Note sharing (public URL generation)

## Testing Considerations

- Create, read, update, delete notes
- Auto-save triggers correctly
- Public/private visibility works
- Navigation links work from both locations
- Markdown rendering displays correctly
- Long notes handle properly
- Error handling for API failures

## Files to Create/Modify

### New Files:
1. `prisma/schema.prisma` - Add Note model (modify existing)
2. `lib/notes/queries.ts` - Note query functions
3. `app/api/notes/route.ts` - Notes list API
4. `app/api/notes/[id]/route.ts` - Individual note API
5. `components/notes/MarkdownEditor.tsx` - Markdown editor component
6. `components/notes/NotesList.tsx` - Notes list component
7. `app/notes/page.tsx` - Notes list page
8. `app/notes/[id]/page.tsx` - Note editor page
9. `app/notes/public/[id]/page.tsx` - Public note view (optional)

### Modified Files:
1. `package.json` - Add react-md-editor dependency
2. `components/AppSidebar.tsx` - Add Notes menu item
3. `components/AppSidebarUserMenu.tsx` - Add Notes menu item
4. `components/UserDropdown.tsx` - Add Notes dropdown item
5. `lib/types/index.ts` - Add Note type definition (optional)

## Notes

- Consider adding note tags/categories in future iterations
- Consider adding note search functionality
- Consider adding note export (PDF, HTML, etc.)
- Consider adding note templates
- Consider adding collaborative editing features
- Consider adding note versioning/history
