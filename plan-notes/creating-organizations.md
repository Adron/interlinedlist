# Creating Organizations Feature - Implementation Plan

## Overview

Implement an organization system where users can belong to multiple organizations. All users start as members of "The Public" organization by default, which is a special system organization that cannot be deleted or modified. Organizations support public/private visibility, user roles (owner/admin/member), and are designed to support organization-specific content in the future.

## Requirements Summary

- **Multiple Organizations**: Users can belong to multiple organizations simultaneously
- **Default Organization**: All users automatically belong to "The Public" organization
- **Roles**: Users have roles within organizations (owner, admin, member)
- **Visibility**: Organizations can be public (anyone can see/join) or private (invite-only)
- **Special Organization**: "The Public" is a system organization with restrictions
- **Future-Proof**: Schema designed to support organization-specific content later

## Database Schema Changes

### 1. Add Organization Model to Prisma Schema

**File**: `prisma/schema.prisma`

Add a new `Organization` model with extended properties:

```prisma
model Organization {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique  // URL-friendly version of name
  description String?
  avatar      String?
  isPublic    Boolean  @default(true)  // Public organizations can be seen/joined by anyone
  isSystem    Boolean  @default(false)  // System organizations (like "The Public") cannot be deleted/modified
  settings    Json?    // Flexible settings storage for future features
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  members     UserOrganization[]

  @@index([isPublic, deletedAt])
  @@index([isSystem])
  @@index([slug])
  @@index([deletedAt])
  @@map("organizations")
}
```

**Key Schema Details:**

- **Multiple Organizations**: Each organization is a separate entity
- **Unique Name & Slug**: Organizations have unique names and URL-friendly slugs
- **Public/Private**: `isPublic` controls visibility (public = anyone can see/join)
- **System Organizations**: `isSystem` flag marks special organizations like "The Public"
- **Soft Delete**: `deletedAt` allows soft deletion (except for system organizations)
- **Settings**: JSON field for flexible future configuration
- **Indexes**: Optimized for public/private queries and slug lookups

### 2. Add UserOrganization Join Table (Many-to-Many)

**File**: `prisma/schema.prisma`

Add a join table to support many-to-many relationship with roles:

```prisma
model UserOrganization {
  id             String       @id @default(uuid())
  userId         String
  organizationId String
  role           String       @default("member")  // "owner", "admin", "member"
  joinedAt       DateTime     @default(now())
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])  // User can only be in an organization once
  @@index([userId])
  @@index([organizationId])
  @@index([userId, role])
  @@index([organizationId, role])
  @@map("user_organizations")
}
```

**Relationship Details:**

- **Many-to-Many**: Users can belong to multiple organizations, organizations can have multiple users
- **Roles**: Each membership has a role (owner, admin, member)
- **Unique Constraint**: Prevents duplicate memberships (user can't be in same org twice)
- **Cascade Delete**: Removing user removes all memberships; removing org removes all memberships
- **Indexes**: Optimized for querying user's organizations, org's members, and role-based queries

### 3. Update User Model

**File**: `prisma/schema.prisma`

Add the `organizations` relation to the existing `User` model:

```prisma
model User {
  // ... existing fields ...
  messages             Message[]
  lists                List[]
  notes                Note[]
  organizations        UserOrganization[]  // Add this line
  administrator        Administrator?

  @@map("users")
}
```

**Relationship Details:**

- One user can have many organization memberships (`organizations UserOrganization[]`)
- Each membership links to one organization via `UserOrganization` join table
- Cascade delete ensures data integrity (deleting user removes all memberships)

### 4. Database Migration

**Migration File**: `prisma/migrations/[timestamp]_add_organizations/migration.sql`

The migration will create:

1. **`organizations` table** with:
   - `id` (UUID primary key)
   - `name` (VARCHAR/TEXT, unique)
   - `slug` (VARCHAR/TEXT, unique)
   - `description` (TEXT, nullable)
   - `avatar` (TEXT, nullable)
   - `isPublic` (BOOLEAN, default true)
   - `isSystem` (BOOLEAN, default false)
   - `settings` (JSONB, nullable)
   - `createdAt` (TIMESTAMP)
   - `updatedAt` (TIMESTAMP)
   - `deletedAt` (TIMESTAMP, nullable)

2. **`user_organizations` join table** with:
   - `id` (UUID primary key)
   - `userId` (foreign key to users table)
   - `organizationId` (foreign key to organizations table)
   - `role` (VARCHAR, default 'member')
   - `joinedAt` (TIMESTAMP)
   - `createdAt` (TIMESTAMP)
   - `updatedAt` (TIMESTAMP)
   - Unique constraint on `(userId, organizationId)`

3. **Foreign key constraints**:
   - `user_organizations_userId_fkey` referencing `users(id)` with `ON DELETE CASCADE`
   - `user_organizations_organizationId_fkey` referencing `organizations(id)` with `ON DELETE CASCADE`

4. **Indexes**:
   - `organizations_isPublic_deletedAt_idx` - Composite index for public organizations
   - `organizations_isSystem_idx` - Index for system organizations
   - `organizations_slug_idx` - Index for slug lookups
   - `user_organizations_userId_idx` - Index for user's organizations
   - `user_organizations_organizationId_idx` - Index for organization's members
   - `user_organizations_userId_role_idx` - Index for user's roles
   - `user_organizations_organizationId_role_idx` - Index for org's members by role

5. **Seed "The Public" Organization**:
   - Create "The Public" organization with `isSystem = true`, `isPublic = true`
   - Add all existing users to "The Public" with role "member"
   - This can be done in the migration SQL or in a separate seed script

**Migration Command:**

```bash
npm run db:migrate
```

This will:
- Generate the migration SQL file
- Apply it to the database
- Regenerate Prisma Client with the new models

### 5. Seed "The Public" Organization

**Option A: In Migration SQL** (Recommended for initial setup)

Add to the migration SQL file after creating tables:

```sql
-- Create "The Public" system organization
INSERT INTO "organizations" ("id", "name", "slug", "description", "isPublic", "isSystem", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'The Public',
  'the-public',
  'The default public organization that all users belong to.',
  true,
  true,
  NOW(),
  NOW()
);

-- Add all existing users to "The Public" organization
INSERT INTO "user_organizations" ("id", "userId", "organizationId", "role", "joinedAt", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  "id",
  '00000000-0000-0000-0000-000000000001',
  'member',
  NOW(),
  NOW(),
  NOW()
FROM "users";
```

**Option B: Separate Seed Script**

Create `scripts/seed-public-organization.js` to run after migration:

```javascript
// Script to ensure "The Public" organization exists and all users are members
// Run with: node scripts/seed-public-organization.js
```

### 6. TypeScript Type Definitions

**File**: `lib/types/index.ts`

Add type definitions:

```typescript
export type OrganizationRole = 'owner' | 'admin' | 'member';

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
```

## Query Functions

**File**: `lib/organizations/queries.ts` (new)

Create utility functions following the pattern used in `lib/lists/queries.ts`:

### Organization Queries

**1. `getOrganizationById(organizationId: string)`**
- Get a single organization by ID
- Returns `null` if organization is deleted or doesn't exist
- Used for organization lookups

**2. `getOrganizationBySlug(slug: string)`**
- Get organization by URL-friendly slug
- Returns `null` if not found or deleted
- Used for public organization pages

**3. `getPublicOrganizations(options?)`**
- Get all public organizations (not deleted)
- Options: `{ limit?: number, offset?: number }`
- Returns paginated list
- Uses `[isPublic, deletedAt]` index

**4. `getUserOrganizations(userId: string, options?)`**
- Get all organizations a user belongs to
- Options: `{ includeDeleted?: boolean, role?: OrganizationRole }`
- Returns organizations with membership details
- Uses `[userId]` index on join table

**5. `getOrganizationMembers(organizationId: string, options?)`**
- Get all members of an organization
- Options: `{ limit?: number, offset?: number, role?: OrganizationRole }`
- Returns users with their roles
- Uses `[organizationId]` index

**6. `createOrganization(data: { name: string, description?: string, avatar?: string, isPublic?: boolean, createdBy: string })`**
- Create a new organization
- Automatically sets creator as "owner"
- Generates slug from name (URL-friendly, unique)
- Returns created organization with creator membership

**7. `updateOrganization(organizationId: string, userId: string, data: { name?: string, description?: string, avatar?: string, isPublic?: boolean, settings?: any })`**
- Update organization (requires owner/admin role)
- Cannot update system organizations
- Verifies user has permission
- Returns updated organization

**8. `deleteOrganization(organizationId: string, userId: string)`**
- Soft delete organization (requires owner role)
- Cannot delete system organizations
- Sets `deletedAt` timestamp
- Returns deleted organization

**9. `addUserToOrganization(organizationId: string, userId: string, role?: OrganizationRole, addedBy?: string)`**
- Add user to organization
- Default role is "member"
- If organization is private, requires admin/owner to add
- If organization is public, user can join themselves
- Returns UserOrganization record

**10. `removeUserFromOrganization(organizationId: string, userId: string, removedBy: string)`**
- Remove user from organization
- Requires admin/owner role (or user removing themselves)
- Cannot remove last owner
- Returns removed membership

**11. `updateUserRole(organizationId: string, userId: string, newRole: OrganizationRole, updatedBy: string)`**
- Update user's role in organization
- Requires owner role (or admin promoting to member/admin)
- Cannot demote last owner
- Returns updated UserOrganization

**12. `getPublicOrganization()`**
- Get "The Public" system organization
- Returns the organization with `isSystem = true` and name "The Public"
- Used for default organization operations

**13. `ensureUserInPublicOrganization(userId: string)`**
- Ensure user is a member of "The Public" organization
- If not already a member, adds them with role "member"
- Called during user registration
- Idempotent (safe to call multiple times)

**14. `checkUserPermission(organizationId: string, userId: string, requiredRole: 'owner' | 'admin' | 'member')`**
- Check if user has required permission level
- Returns boolean
- Used for authorization checks
- Role hierarchy: owner > admin > member

**Example Implementation Pattern:**

```typescript
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { OrganizationRole } from '@/lib/types';

export async function getUserOrganizations(
  userId: string,
  options: { includeDeleted?: boolean; role?: OrganizationRole } = {}
) {
  const { includeDeleted = false, role } = options;

  const where: Prisma.UserOrganizationWhereInput = {
    userId,
    ...(role ? { role } : {}),
    ...(includeDeleted ? {} : { organization: { deletedAt: null } }),
  };

  const memberships = await prisma.userOrganization.findMany({
    where,
    include: {
      organization: true,
    },
    orderBy: {
      joinedAt: 'desc',
    },
  });

  return memberships.map((m) => ({
    ...m.organization,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}

export async function ensureUserInPublicOrganization(userId: string) {
  const publicOrg = await getPublicOrganization();
  if (!publicOrg) {
    throw new Error('Public organization not found');
  }

  const existing = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: publicOrg.id,
      },
    },
  });

  if (!existing) {
    await prisma.userOrganization.create({
      data: {
        userId,
        organizationId: publicOrg.id,
        role: 'member',
      },
    });
  }

  return publicOrg;
}
```

## API Routes

### 1. Organizations List API

**File**: `app/api/organizations/route.ts` (new)

- **GET**: Get organizations
  - Query params:
    - `public` (boolean) - Filter to public organizations only
    - `userId` (string) - Get organizations for specific user (requires auth)
    - `limit`, `offset` - Pagination
  - If `userId` provided: Returns user's organizations
  - If `public=true`: Returns all public organizations
  - Returns: `{ organizations: Organization[], pagination: { total, limit, offset } }`

- **POST**: Create a new organization
  - Body: `{ name: string, description?: string, avatar?: string, isPublic?: boolean }`
  - Requires authentication
  - Creator automatically becomes "owner"
  - Returns created organization with membership

### 2. Individual Organization API

**File**: `app/api/organizations/[id]/route.ts` (new)

- **GET**: Get organization by ID or slug
  - If public or user is member, returns organization
  - Includes member count
  - Returns 404 if not found or private and user not member

- **PUT**: Update organization
  - Body: `{ name?: string, description?: string, avatar?: string, isPublic?: boolean, settings?: any }`
  - Requires authentication and owner/admin role
  - Cannot update system organizations
  - Returns updated organization

- **DELETE**: Delete organization (soft delete)
  - Requires authentication and owner role
  - Cannot delete system organizations
  - Returns deleted organization

### 3. Organization Members API

**File**: `app/api/organizations/[id]/members/route.ts` (new)

- **GET**: Get organization members
  - Query params: `limit`, `offset`, `role` (filter by role)
  - Requires user to be member of organization
  - Returns: `{ members: User[], pagination: { total, limit, offset } }`

- **POST**: Add member to organization
  - Body: `{ userId: string, role?: OrganizationRole }`
  - Requires authentication and admin/owner role (or public org for self-join)
  - Returns created membership

### 4. Organization Membership API

**File**: `app/api/organizations/[id]/members/[userId]/route.ts` (new)

- **PUT**: Update member role
  - Body: `{ role: OrganizationRole }`
  - Requires authentication and owner role (or admin for member/admin roles)
  - Returns updated membership

- **DELETE**: Remove member from organization
  - Requires authentication and admin/owner role (or user removing themselves)
  - Cannot remove last owner
  - Returns removed membership

### 5. User Organizations API

**File**: `app/api/user/organizations/route.ts` (new)

- **GET**: Get current user's organizations
  - Query params: `role` (filter by role)
  - Requires authentication
  - Returns user's organizations with roles

- **POST**: Join organization (for public organizations)
  - Body: `{ organizationId: string }`
  - Requires authentication
  - Only works for public organizations
  - Returns created membership

## Components

### 1. Organization List Component

**File**: `components/organizations/OrganizationList.tsx` (new)

Display list of organizations:
- Shows organization name, description, avatar
- Public/private indicator
- Member count
- "Join" button for public organizations (if not already member)
- Link to organization details
- Filter by public/private
- Pagination support

### 2. User Organizations Component

**File**: `components/organizations/UserOrganizations.tsx` (new)

Display user's organizations:
- Shows organizations user belongs to
- Shows role in each organization
- "Leave" button (if not last owner)
- Link to organization details
- Filter by role

### 3. Organization Card Component

**File**: `components/organizations/OrganizationCard.tsx` (new)

Display single organization:
- Organization avatar, name, description
- Public/private badge
- Member count
- Role badge (if viewing as member)
- Action buttons (join/leave/view)

### 4. Organization Members List Component

**File**: `components/organizations/OrganizationMembers.tsx` (new)

Display organization members:
- List of members with avatars, names
- Role badges
- Admin actions (change role, remove) for owners/admins
- Pagination support

### 5. Create Organization Form Component

**File**: `components/organizations/CreateOrganizationForm.tsx` (new)

Form to create new organization:
- Name input (with slug preview)
- Description textarea
- Avatar URL input
- Public/private toggle
- Submit button
- Validation

## Pages

### 1. Organizations List Page

**File**: `app/organizations/page.tsx` (new)

Main organizations page:
- Shows `OrganizationList` component
- "Create Organization" button (if authenticated)
- Filter by public/private
- Search functionality (future)

### 2. Organization Details Page

**File**: `app/organizations/[slug]/page.tsx` (new)

Organization detail page:
- Shows organization info (`OrganizationCard`)
- Shows members (`OrganizationMembers`)
- Edit button (if owner/admin)
- Join/Leave button (if applicable)
- Future: Organization content (messages, lists)

### 3. User Organizations Page

**File**: `app/user/organizations/page.tsx` (new)

User's organizations page:
- Shows `UserOrganizations` component
- "Join Organization" button/link
- "Create Organization" button

## Navigation Updates

### 1. Left Sidebar Menu

**File**: `components/AppSidebar.tsx`

Add "Organizations" menu item:

```tsx
{/* Organizations */}
{user && (
  <li className="nav-item">
    <Link className="nav-link" href="/organizations">
      <span className="nav-icon">
        <i className="bx bx-group"></i>
      </span>
      <span className="nav-text">Organizations</span>
    </Link>
  </li>
)}
```

### 2. User Dropdown Menu

**File**: `components/UserDropdown.tsx`

Add "My Organizations" link:

```tsx
{/* My Organizations */}
<Link 
  className="dropdown-item" 
  href="/user/organizations"
  onClick={() => setIsOpen(false)}
>
  <i className="bx bx-group align-middle me-2" style={{ fontSize: '18px' }}></i>
  <span className="align-middle">My Organizations</span>
</Link>
```

### 3. Sidebar User Menu

**File**: `components/AppSidebarUserMenu.tsx`

Add "My Organizations" link:

```tsx
{/* My Organizations */}
<li className="nav-item">
  <Link className="nav-link" href="/user/organizations">
    <span className="nav-icon">
      <i className="bx bx-group"></i>
    </span>
    <span className="nav-text">My Organizations</span>
  </Link>
</li>
```

## User Registration Integration

**File**: `app/api/auth/register/route.ts`

Update user registration to automatically add new users to "The Public" organization:

```typescript
// After creating user
import { ensureUserInPublicOrganization } from '@/lib/organizations/queries';

// ... create user ...

await ensureUserInPublicOrganization(user.id);
```

## Utility Functions

**File**: `lib/organizations/utils.ts` (new)

Helper functions:

- `generateSlug(name: string)`: Convert organization name to URL-friendly slug
- `validateSlug(slug: string)`: Validate slug format
- `canUserModifyOrganization(userId: string, organization: Organization)`: Check if user can modify org
- `canUserDeleteOrganization(userId: string, organization: Organization)`: Check if user can delete org
- `getRoleHierarchy(role: OrganizationRole)`: Get numeric hierarchy value for role comparison

## Implementation Order

1. **Database Setup** (CRITICAL - Must be done first):
   - Add `Organization` model to Prisma schema
   - Add `UserOrganization` join table model
   - Add `organizations` relation to `User` model
   - Run `npm run db:migrate` to create migration
   - Verify migration creates tables, indexes, and foreign keys
   - Seed "The Public" organization and add all existing users
   - Test that Prisma Client regenerates with new models

2. Create query functions in `lib/organizations/queries.ts`:
   - Implement all database query functions
   - Test queries return multiple organizations per user
   - Test "The Public" organization queries
   - Verify role-based permission checks

3. Create utility functions in `lib/organizations/utils.ts`:
   - Slug generation and validation
   - Permission checking helpers

4. Update user registration (`app/api/auth/register/route.ts`):
   - Add automatic membership in "The Public" organization

5. Create API routes:
   - `/api/organizations/route.ts` - List and create organizations
   - `/api/organizations/[id]/route.ts` - Get, update, delete organization
   - `/api/organizations/[id]/members/route.ts` - Manage members
   - `/api/organizations/[id]/members/[userId]/route.ts` - Update/remove member
   - `/api/user/organizations/route.ts` - User's organizations

6. Create components:
   - `OrganizationList` - List of organizations
   - `UserOrganizations` - User's organizations
   - `OrganizationCard` - Single organization display
   - `OrganizationMembers` - Organization members list
   - `CreateOrganizationForm` - Create organization form

7. Create pages:
   - `/organizations` - Organizations list page
   - `/organizations/[slug]` - Organization details page
   - `/user/organizations` - User's organizations page

8. Update navigation components:
   - Add Organizations link to `AppSidebar.tsx`
   - Add My Organizations link to `AppSidebarUserMenu.tsx`
   - Add My Organizations link to `UserDropdown.tsx`

9. Test multiple organizations:
   - Create multiple organizations
   - Verify users can belong to multiple organizations
   - Test "The Public" organization is special
   - Test role-based permissions
   - Test public/private visibility

10. Test user registration:
    - Verify new users automatically join "The Public"
    - Test existing users are in "The Public" (via migration)

## Database Storage Considerations

**Multiple Organizations Per User:**
- Each user can belong to unlimited organizations via many-to-many relationship
- Memberships are stored as separate rows in `user_organizations` join table
- Each membership has a role (owner, admin, member)
- Users are independent of organizations - removing from one doesn't affect others

**Storage Optimization:**
- Composite indexes optimize common query patterns
- Unique constraint on `(userId, organizationId)` prevents duplicates
- Soft delete on organizations allows recovery
- Cascade deletes maintain data integrity

**Query Performance:**
- Indexes support efficient filtering:
  - User's organizations: `WHERE userId = ?` (uses `[userId]` index)
  - Organization's members: `WHERE organizationId = ?` (uses `[organizationId]` index)
  - Public organizations: `WHERE isPublic = true AND deletedAt IS NULL` (uses `[isPublic, deletedAt]` index)
  - Role-based queries: `WHERE userId = ? AND role = ?` (uses `[userId, role]` index)

**Data Integrity:**
- Foreign key constraints ensure memberships reference valid users/organizations
- Cascade delete prevents orphaned memberships
- Unique constraint prevents duplicate memberships
- System organization flag prevents deletion/modification of "The Public"

**Special Handling:**
- "The Public" organization has `isSystem = true`
- System organizations cannot be deleted or have `isSystem` changed
- All users should be members of "The Public" (enforced in registration and migration)

## Edge Cases to Handle

- User tries to delete "The Public" organization (prevent)
- User tries to remove themselves as last owner (prevent)
- User tries to join private organization without invite (prevent)
- User tries to update system organization (prevent)
- Duplicate organization names (handle with slug uniqueness)
- Slug collisions (generate unique slug with number suffix)
- User registration fails after creating user but before adding to "The Public" (handle rollback)
- Migration fails partway through (handle transaction rollback)

## Testing Considerations

- Create multiple organizations
- Add users to multiple organizations
- Test role-based permissions (owner > admin > member)
- Test public/private organization visibility
- Test "The Public" organization restrictions
- Test user registration adds to "The Public"
- Test migration adds existing users to "The Public"
- Test cascade deletes (user deletion removes memberships)
- Test organization deletion removes memberships
- Test unique constraint (user can't join same org twice)
- Test role updates and restrictions
- Test pagination with many organizations/members

## Files to Create/Modify

### New Files:
1. `prisma/schema.prisma` - Add Organization and UserOrganization models (modify existing)
2. `lib/organizations/queries.ts` - Organization query functions
3. `lib/organizations/utils.ts` - Utility functions (slug generation, permissions)
4. `lib/types/index.ts` - Add Organization and UserOrganization types (modify existing)
5. `app/api/organizations/route.ts` - Organizations list API
6. `app/api/organizations/[id]/route.ts` - Individual organization API
7. `app/api/organizations/[id]/members/route.ts` - Organization members API
8. `app/api/organizations/[id]/members/[userId]/route.ts` - Member management API
9. `app/api/user/organizations/route.ts` - User organizations API
10. `components/organizations/OrganizationList.tsx` - Organizations list component
11. `components/organizations/UserOrganizations.tsx` - User's organizations component
12. `components/organizations/OrganizationCard.tsx` - Organization card component
13. `components/organizations/OrganizationMembers.tsx` - Members list component
14. `components/organizations/CreateOrganizationForm.tsx` - Create organization form
15. `app/organizations/page.tsx` - Organizations list page
16. `app/organizations/[slug]/page.tsx` - Organization details page
17. `app/user/organizations/page.tsx` - User's organizations page

### Modified Files:
1. `prisma/schema.prisma` - Add Organization, UserOrganization models, update User model
2. `app/api/auth/register/route.ts` - Add automatic "The Public" membership
3. `components/AppSidebar.tsx` - Add Organizations menu item
4. `components/AppSidebarUserMenu.tsx` - Add My Organizations menu item
5. `components/UserDropdown.tsx` - Add My Organizations dropdown item

## Future Enhancements

- Organization-specific content (messages, lists, notes)
- Organization invitations system
- Organization settings and permissions
- Organization analytics
- Organization search and discovery
- Organization templates
- Organization hierarchies (parent/child organizations)
- Organization branding (custom themes)
- Organization API keys
- Organization webhooks
