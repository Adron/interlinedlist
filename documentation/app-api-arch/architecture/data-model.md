# Data Model

Prisma schema defines the following models.

## Core Entities

### User

- Authentication: `email`, `username`, `passwordHash`
- Profile: `displayName`, `avatar`, `bio`
- Preferences: `theme`, `maxMessageLength`, `defaultPubliclyVisible`, `messagesPerPage`, `viewingPreference`, `showPreviews`, `showAdvancedPostSettings`
- Security: `emailVerified`, `emailVerificationToken`, `passwordResetToken`, `isPrivateAccount`
- Location: `latitude`, `longitude`
- Relations: `messages`, `lists`, `organizations`, `followers`, `following`, `linkedIdentities`, `listWatchers`

### Message

- `content`, `publiclyVisible`
- `linkMetadata` (JSONB): Open Graph, oEmbed metadata for links
- `imageUrls`, `videoUrls` (JSONB): Media URLs
- `user` → User
- `lists` → List[] (many-to-many)

### List

- `title`, `description`, `isPublic`, `metadata` (JSONB)
- `parentId` → parent List (tree structure)
- `children` → List[]
- `user` → User
- `message` → Message (optional)
- `properties` → ListProperty[]
- `dataRows` → ListDataRow[]
- `watchers` → ListWatcher[]
- Soft delete: `deletedAt`

### ListWatcher

- `userId` → User
- `listId` → List
- `role`: `"watcher"` | `"collaborator"` | `"manager"` (default: watcher)
- Unique on `[userId, listId]`
- **Watcher**: Can follow the list; shown on owner's public profile
- **Collaborator**: Can add, edit, delete rows
- **Manager**: Collaborator + can edit list schema

### ListProperty

- Defines schema fields: `propertyKey`, `propertyName`, `propertyType`, `displayOrder`
- `isRequired`, `defaultValue`, `validationRules` (JSON), `helpText`, `placeholder`
- `visibilityCondition` (JSON): conditional logic
- `list` → List

### ListDataRow

- `rowData` (JSONB): field values matching list schema
- `rowNumber`, `deletedAt` (soft delete)
- `list` → List

## Organizations

### Organization

- `name`, `slug`, `description`, `avatar`
- `isPublic`, `isSystem` (e.g. "The Public")
- `settings` (JSONB)
- Soft delete: `deletedAt`

### UserOrganization

- Many-to-many: User ↔ Organization
- `role`: owner, admin, member
- `active`: membership status

## Social

### Follow

- `followerId` → User (who follows)
- `followingId` → User (who is followed)
- `status`: approved, pending, etc.

### LinkedIdentity

- OAuth: `provider` (github, bluesky, mastodon:instance)
- `providerUserId`, `providerUsername`, `providerData`, `profileUrl`, `avatarUrl`
- `user` → User

## Admin

### Administrator

- `userId` → User (admin flag)
