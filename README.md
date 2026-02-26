# InterlinedList

Time-series based micro-blogging platform, with embedded script for creating interactive lists.

## Prerequisites

- **Node.js**: Version 18+ (required for Next.js and Prisma)
  - Check your version: `node --version`
- **npm**: Latest version
- **PostgreSQL**: Postgres.app (macOS) or PostgreSQL installed locally
  - For Postgres.app: Ensure PostgreSQL is running on port 5666

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd interlinedlist
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- Next.js 14
- React 18
- Prisma
- TypeScript

### 3. Set Up Database

#### Automated Setup (Recommended)

The project includes an automated database setup script that handles user creation, database creation, permissions, and migrations.

**Prerequisites:**
- PostgreSQL must be running locally
- You must have superuser access (either as `postgres` user or your current user with superuser privileges)

**Steps:**

1. **Create `.env.local` file** in the project root:
   ```bash
   touch .env.local
   ```

2. **Add your database configuration** to `.env.local`:
   ```env
   DATABASE_URL="postgresql://interlinedlist:interlinedlist_dev_password@localhost:5432/interlinedlist?schema=public"
   ```
   
   **Note:** The script will create a user `interlinedlist` with password `interlinedlist_dev_password` and database `interlinedlist`. If you prefer different credentials, edit `scripts/setup-database.sh` before running.

3. **Make the script executable** (if not already):
   ```bash
   chmod +x scripts/setup-database.sh
   ```

4. **Run the setup script**:
   ```bash
   ./scripts/setup-database.sh
   ```

   The script will:
   - Check PostgreSQL connection
   - Create database user `interlinedlist` (if it doesn't exist)
   - Grant `CREATEDB` permission (required for Prisma shadow database)
   - Create database `interlinedlist` (if it doesn't exist)
   - Grant all necessary permissions
   - Run Prisma migrations automatically
   - Seed initial data ("The Public" organization and seed user "Adron")

**What the script does:**
- Creates a PostgreSQL user with the configured password
- Grants `CREATEDB` permission (required for Prisma migrations)
- Creates the database owned by the new user
- Grants all privileges on the database and schema
- Runs Prisma migrations to set up all tables
- Seeds initial data:
  - Creates "The Public" system organization
  - Creates initial seed user "Adron" (email: `adronhall@proton.me`, password: `changeme123`)
  - Adds seed user to "The Public" organization
  - Adds any existing users to "The Public" organization

#### Manual Setup (Alternative)

If you prefer to set up the database manually:

**Using Postgres.app (macOS):**

1. **Start Postgres.app** and ensure it's running on port 5666
2. **Create the database**:
   ```bash
   createdb interlinedlist
   ```
3. **Configure environment variables**:
   - Create a `.env.local` file in the project root
   - Add your database connection string:
     ```env
     DATABASE_URL="postgresql://<your-username>@localhost:5666/interlinedlist"
     ```
   - Replace `<your-username>` with your macOS username (find it with `whoami`)

**Using Standard PostgreSQL:**

1. Ensure PostgreSQL is running
2. Create the database:
   ```bash
   createdb interlinedlist
   ```
3. Update `.env.local` with your connection string:
   ```env
   DATABASE_URL="postgresql://<user>:<password>@localhost:5432/interlinedlist"
   ```

4. **Run migrations manually**:
   ```bash
   npm run db:migrate
   ```

### 4. Verify Database Setup

After running the setup script or manual setup, verify everything is working:

```bash
npm run db:studio
```

This will open Prisma Studio at `http://localhost:5555` where you can view your database tables.

### 5. Initial Seed Data

After running `setup-database.sh`, the following initial data is automatically created:

- **"The Public" Organization**: A system organization that all users belong to by default
- **Seed User "Adron"**: 
  - Username: `Adron`
  - Email: `adronhall@proton.me`
  - Password: `changeme123` (please change on first login)
  - Email Verified: `true`

You can log in with these credentials immediately after setup.

### 6. Seed Test Data (Optional)

The project includes test data for local development and testing. This includes 71 test user accounts and thousands of test messages.

**Prerequisites:**
- Database must be set up and migrations must be run (see step 3)
- `.env.local` must contain a valid `DATABASE_URL`

**To seed test data:**

```bash
npm run test-data:seed
```

This command will:
- Create 71 test user accounts with realistic profiles
- Generate 10-50 test messages for each user (approximately 1,500-3,500 total messages)
- Include links in approximately 15% of messages (Instagram, Blue Sky, Threads, Mastodon, etc.)
- Spread messages over the past 6 months with varied timestamps
- Mix public and private messages (~80% public, ~20% private)

**Default Test Account Credentials:**

All test accounts use the same password:
```
Password: TestAccount123!
```

All accounts are pre-verified (emailVerified: true) so you can log in immediately without email verification.

**What Gets Created:**

- **71 User Accounts**: Diverse profiles representing various professions (developers, designers, managers, data scientists, etc.)
- **Test Messages**: Each user gets 10-50 messages with realistic content based on their profession
- **Message Links**: ~15% of messages contain links to social media platforms for testing link preview functionality
- **Varied Timestamps**: Messages are spread over the past 6 months to simulate real usage

**Notes:**

- The script safely skips accounts that already exist (by username or email)
- You can run the script multiple times without creating duplicates
- To recreate accounts, delete them from the database first, then re-run the script
- Test data is for **development and testing only** - do not use in production

For more details, see [`test-data/README.md`](test-data/README.md).

### 7. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Safe migration script (checks status, prevents destructive resets, applies pending migrations safely)
- `npm run db:migrate:deploy` - Apply migrations to production database (non-destructive, only applies existing migrations)
- `npm run db:migrate:force` - Force migration with `prisma migrate dev` (may prompt for reset - use with caution)
- `npm run db:generate` - Generate Prisma Client
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run backup` - Create database backups (production and local)
- `npm run restore` - Restore database from backup file
- `npm run test-data:seed` - Seed test accounts and messages into the database
- `node scripts/seed-initial-data.js` - Seed initial data ("The Public" organization and seed user)
- `npm run cli:build` - Build the Document Sync CLI for all platforms and copy to `public/downloads/`
- `npm run cli:test` - Run CLI unit tests
- `npm run cli:test-local` - Run CLI integration tests against a local dev server

## CLI (Document Sync)

The project includes a Document Sync CLI (`il-sync`) for syncing local markdown files with the website. See [cli/README.md](cli/README.md) for build steps and how the CLI is integrated with interlinedlist.com.

## Project Structure

```
interlinedlist/
├── app/                          # Next.js app directory (App Router)
│   ├── api/                      # API routes
│   │   ├── admin/                # Admin endpoints
│   │   │   ├── email-logs/       # Email log retrieval
│   │   │   └── users/            # Admin user management (list, create, bulk operations)
│   │   │       ├── [userId]/     # Individual user admin operations
│   │   │       ├── bulk-clearance/
│   │   │       ├── bulk-delete/
│   │   │       └── bulk-status/
│   │   ├── architecture-aggregates/ # DB schema and aggregate data endpoints
│   │   │   ├── [table]/          # Per-table data
│   │   │   └── schema/           # Schema introspection
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── bluesky/          # Bluesky OAuth (authorize, callback)
│   │   │   ├── forgot-password/  # Password reset request
│   │   │   ├── github/           # GitHub OAuth (authorize, callback)
│   │   │   ├── login/            # User login
│   │   │   ├── logout/           # User logout
│   │   │   ├── mastodon/         # Mastodon OAuth (authorize, callback)
│   │   │   ├── register/         # User registration
│   │   │   ├── reset-password/   # Password reset confirmation
│   │   │   ├── send-verification-email/  # Resend verification email
│   │   │   ├── sync-token/       # CLI sync token issuance
│   │   │   ├── verify-email/     # Email verification
│   │   │   └── verify-email-change/  # Email change verification
│   │   ├── documents/            # Document sync endpoints
│   │   │   ├── [id]/             # Individual document operations
│   │   │   │   └── images/upload/ # Image upload for documents
│   │   │   ├── folders/          # Folder management
│   │   │   │   └── [id]/         # Individual folder operations
│   │   │   │       └── documents/ # Documents within a folder
│   │   │   └── sync/             # CLI sync endpoint
│   │   ├── exports/              # Data export endpoints
│   │   │   ├── follows/          # Export follow relationships
│   │   │   ├── list-data-rows/   # Export list data rows
│   │   │   ├── lists/            # Export lists
│   │   │   └── messages/         # Export messages
│   │   ├── follow/               # Follow system endpoints
│   │   │   ├── [userId]/         # Follow operations for a user
│   │   │   │   ├── approve/      # Approve follow request
│   │   │   │   ├── counts/       # Follower/following counts
│   │   │   │   ├── followers/    # List followers
│   │   │   │   ├── following/    # List following
│   │   │   │   ├── mutual/       # Mutual follows
│   │   │   │   ├── reject/       # Reject follow request
│   │   │   │   ├── remove/       # Remove follower
│   │   │   │   └── status/       # Follow status
│   │   │   └── requests/         # Pending follow requests
│   │   ├── images/               # Image proxy endpoints
│   │   │   └── proxy/            # Image proxy for external images (CORS bypass)
│   │   ├── lists/                # List endpoints
│   │   │   ├── [id]/             # Individual list operations
│   │   │   │   ├── data/         # List data row operations
│   │   │   │   │   └── [rowId]/  # Individual row operations
│   │   │   │   ├── schema/       # List schema operations
│   │   │   │   └── watchers/     # List watcher/access management
│   │   │   │       ├── [userId]/ # Individual watcher operations
│   │   │   │       ├── me/       # Current user's watcher status
│   │   │   │       └── users/    # List all watchers
│   │   │   └── route.ts          # GET/POST lists
│   │   ├── location/             # Location widget endpoint
│   │   ├── messages/             # Message endpoints
│   │   │   ├── [id]/             # Individual message operations
│   │   │   │   ├── metadata/     # Link metadata fetching
│   │   │   │   └── replies/      # Message replies
│   │   │   ├── images/upload/    # Image upload for messages
│   │   │   └── videos/upload/    # Video upload for messages
│   │   ├── oauth/                # OAuth client metadata
│   │   │   └── client-metadata/  # Bluesky OAuth client metadata endpoint
│   │   ├── organizations/        # Organization endpoints
│   │   │   ├── [id]/             # Individual organization operations
│   │   │   │   ├── members/      # Organization member management
│   │   │   │   │   └── [userId]/ # Individual member operations
│   │   │   │   └── users/        # Users in an organization
│   │   │   └── route.ts          # GET/POST organizations
│   │   ├── test-db/              # Database connection test endpoint
│   │   ├── user/                 # Current user management endpoints
│   │   │   ├── [username]/       # Public user profile and messages
│   │   │   ├── avatar/           # Avatar upload and URL import
│   │   │   ├── change-email/     # Email change request workflow
│   │   │   ├── delete/           # Account deletion
│   │   │   ├── identities/       # Linked social identities
│   │   │   ├── organizations/    # User's organizations
│   │   │   └── update/           # Update user profile/settings
│   │   ├── users/                # Public user lookup endpoints
│   │   │   └── [username]/       # User profile by username
│   │   │       └── lists/        # Public lists for a user
│   │   └── weather/              # Weather widget endpoint
│   ├── admin/                    # Admin pages
│   │   ├── email-logging/        # Email log viewer
│   │   ├── support-links/        # Support links management
│   │   └── users/                # User management (list, create)
│   ├── architecture-aggregates/  # DB schema visualizer page
│   ├── dashboard/                # Dashboard page
│   ├── documents/                # Document pages (view, edit, create)
│   │   ├── [id]/                 # Individual document view/edit
│   │   ├── folders/              # Folder pages
│   │   │   ├── [id]/             # Folder view (with new subfolder/doc)
│   │   │   └── new/              # Create new root folder
│   │   └── new/                  # Create new document
│   ├── exports/                  # Data export page
│   ├── forgot-password/          # Password reset page
│   ├── help/                     # In-app help pages
│   │   └── [slug]/               # Dynamic help page by slug
│   ├── lists/                    # List pages
│   │   ├── [id]/                 # List detail / data view
│   │   │   └── edit/             # Edit list (including row edit)
│   │   └── new/                  # Create new list
│   ├── login/                    # Login page and form
│   ├── message/                  # Individual message pages
│   │   └── [id]/                 # Message detail
│   │       └── thread/           # Message thread view
│   ├── organizations/            # Organization pages
│   │   ├── [slug]/               # Organization detail page
│   │   │   └── edit/             # Edit organization
│   │   ├── new/                  # Create organization page
│   │   └── page.tsx              # Organizations list page
│   ├── people/                   # People/user directory page
│   ├── register/                 # Registration page and form
│   ├── reset-password/           # Password reset page
│   ├── settings/                 # User settings page
│   ├── user/                     # User pages
│   │   ├── [username]/           # Public user profile wall
│   │   │   ├── followers/        # User's followers page
│   │   │   ├── following/        # User's following page
│   │   │   └── lists/            # User's public lists
│   │   └── organizations/        # User's organizations page
│   ├── verify-email/             # Email verification page
│   ├── verify-email-change/      # Email change confirmation page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Home page
├── cli/                          # Document Sync CLI (Go)
│   ├── main.go                   # CLI entry point
│   ├── sync/                     # Sync daemon logic
│   ├── Makefile                  # Build targets for all platforms
│   └── README.md                 # CLI build and integration docs
├── components/                   # React components
│   ├── admin/                    # Admin components
│   │   ├── EmailLogTable.tsx     # Email log display
│   │   └── UserManagement.tsx    # Admin user management
│   ├── architecture-aggregates/ # DB visualizer components
│   │   ├── ArchitectureTabs.tsx
│   │   ├── ERDDiagram.tsx
│   │   └── TableDataGrid.tsx
│   ├── documents/                # Document components
│   │   ├── DocumentEditor.tsx    # Markdown document editor
│   │   ├── DocumentList.tsx      # Document list view
│   │   └── FolderTree.tsx        # Folder tree navigation
│   ├── follows/                  # Follow system components
│   │   ├── FollowNavigation.tsx
│   │   ├── FollowRequests.tsx
│   │   ├── FollowersList.tsx
│   │   └── FollowingList.tsx
│   ├── help/                     # Help system components
│   │   ├── HelpNavWrapper.tsx
│   │   └── HelpSidebar.tsx
│   ├── lists/                    # List-related components
│   │   ├── ChildLink.tsx
│   │   ├── DeleteListButton.tsx
│   │   ├── DynamicListForm.tsx
│   │   ├── ListAccessSection.tsx # List access/watcher management
│   │   ├── ListBreadcrumbs.tsx
│   │   ├── ListChildLinks.tsx
│   │   ├── ListConnections.tsx
│   │   ├── ListDataTable.tsx
│   │   ├── ListDetailActions.tsx
│   │   ├── ListSchemaForm.tsx
│   │   ├── ListsDataGrid.tsx
│   │   ├── ListsERDDiagram.tsx
│   │   ├── ListsTabs.tsx
│   │   ├── ListsTreePane.tsx
│   │   ├── ParentLink.tsx
│   │   └── WatchedListsDataGrid.tsx
│   ├── messages/                 # Message-related components
│   │   └── LinkMetadataCard.tsx  # Link preview card component
│   ├── organizations/            # Organization-related components
│   │   ├── CreateOrganizationForm.tsx
│   │   ├── EditOrganizationForm.tsx
│   │   ├── OrganizationCard.tsx
│   │   ├── OrganizationList.tsx
│   │   ├── OrganizationMembers.tsx
│   │   ├── OrganizationMembersDatagrid.tsx
│   │   ├── OrganizationMembersManagement.tsx
│   │   ├── UserOrganizations.tsx
│   │   └── UserSelectionDatagrid.tsx
│   ├── settings/                 # Settings components
│   │   └── ConnectedAccountsSection.tsx # Linked social account management
│   ├── AddListWatcherButton.tsx  # Add watcher to a list
│   ├── Avatar.tsx                # User avatar component
│   ├── AvatarPlaceholder.tsx     # Avatar placeholder component
│   ├── ClearedStatusBanner.tsx   # Account cleared status banner
│   ├── CrossPostErrorToast.tsx   # Cross-post error notification
│   ├── DashboardMessageFeed.tsx  # Dashboard message feed
│   ├── EmailVerificationBanner.tsx  # Email verification banner
│   ├── FollowButton.tsx          # Follow/unfollow button
│   ├── Footer.tsx                # Footer component
│   ├── LeftSidebar.tsx           # Left sidebar with message input
│   ├── ListPreview.tsx           # List preview widget
│   ├── ListsTreeView.tsx         # Lists tree navigation
│   ├── LocationWidget.tsx        # Location widget component
│   ├── Logo.tsx                  # Logo component
│   ├── LogoutButton.tsx          # Logout button component
│   ├── MessageCard.tsx           # Individual message card
│   ├── MessageFeed.tsx           # Message feed component
│   ├── MessageGrid.tsx           # Grid layout for messages
│   ├── MessageInput.tsx          # Message input form
│   ├── MessageList.tsx           # List of messages
│   ├── MessageReplies.tsx        # Message replies display
│   ├── MessageTable.tsx          # Table layout for messages (dashboard)
│   ├── Navigation.tsx            # Navigation bar
│   ├── NavigationTitle.tsx       # Navigation title component
│   ├── ProfileHeader.tsx         # User profile header
│   ├── PublicListsTreeView.tsx   # Public lists tree navigation
│   ├── ReplyInput.tsx            # Reply input form
│   ├── RightSidebar.tsx          # Right sidebar component
│   ├── ThemeBridgeInit.tsx       # Theme bridge initialization
│   ├── ThemeProvider.tsx         # Theme context provider
│   ├── UserDropdown.tsx          # User dropdown menu
│   ├── UserWallSidebar.tsx       # User profile wall sidebar
│   └── WeatherWidget.tsx         # Weather widget component
├── documentation/                # Project documentation
│   ├── app-api-arch/             # Architecture, API, and app design docs
│   │   ├── api/                  # API reference docs
│   │   ├── application-design/   # App structure and component docs
│   │   └── architecture/         # Tech stack and data model docs
│   ├── help/                     # In-app help content (markdown)
│   ├── tooling/                  # CLI and local testing docs
│   └── admin/                    # Admin feature docs
├── DSL/                          # Domain Specific Language for Lists
│   ├── docs/                     # DSL documentation
│   │   ├── conditional-logic.md
│   │   ├── field-types.md
│   │   ├── syntax-reference.md
│   │   └── validation-rules.md
│   ├── examples/                 # DSL example schemas
│   │   ├── customer-list.js
│   │   ├── employee-directory.js
│   │   ├── event-registration.js
│   │   ├── product-inventory.js
│   │   └── task-tracker.js
│   ├── utilities/                # DSL utilities
│   │   ├── builder.ts            # DSL builder API
│   │   ├── transformers.ts       # Schema transformers
│   │   └── validators.ts         # Schema validators
│   ├── index.ts                  # DSL main exports
│   └── README.md                 # DSL documentation
├── lib/                          # Utility functions and configurations
│   ├── architecture-aggregates/  # DB schema introspection utilities
│   │   └── schema-parser.ts
│   ├── auth/                     # Authentication utilities
│   │   ├── admin-access.ts       # Admin role checks
│   │   ├── linked-identities.ts  # Linked social identity helpers
│   │   ├── oauth-bluesky.ts      # Bluesky OAuth integration
│   │   ├── oauth-bluesky-stores.ts # Bluesky OAuth state/session stores
│   │   ├── oauth-github.ts       # GitHub OAuth integration
│   │   ├── oauth-mastodon.ts     # Mastodon OAuth integration
│   │   ├── oauth-state.ts        # OAuth state management
│   │   ├── password.ts           # Password hashing/verification
│   │   ├── session.ts            # Session management
│   │   ├── sync-token.ts         # CLI sync token utilities
│   │   └── tokens.ts             # Token generation/verification
│   ├── avatar/                   # Avatar utilities
│   │   └── resize.ts             # Avatar image resizing
│   ├── bluesky/                  # Bluesky integration utilities
│   │   ├── post-status.ts        # Post to Bluesky
│   │   └── session-from-provider-data.ts
│   ├── config/                   # Application configuration
│   │   ├── app.ts                # App config and constants
│   │   └── weather.ts            # Weather widget config
│   ├── crosspost/                # Cross-posting utilities
│   │   ├── check-platform-follow.ts
│   │   ├── media-distributor.ts
│   │   ├── reply-to-external.ts
│   │   └── text-splitter.ts
│   ├── documents/                # Document utilities
│   │   ├── extract-blob-urls.ts  # Blob URL extraction for sync
│   │   └── queries.ts            # Document database queries
│   ├── email/                    # Email utilities
│   │   ├── build-url.ts          # Email link URL builder
│   │   ├── log-email.ts          # Email logging utility
│   │   ├── resend.ts             # Resend email client
│   │   └── templates/            # Email templates
│   │       ├── email-change-verification.ts
│   │       ├── email-verification.ts
│   │       └── password-reset.ts
│   ├── follows/                  # Follow system utilities
│   │   └── queries.ts            # Follow database queries
│   ├── lists/                    # List utilities
│   │   ├── date-utils.ts         # Date handling for list fields
│   │   ├── dsl-parser.ts         # DSL parser
│   │   ├── dsl-types.ts          # DSL type definitions
│   │   ├── dsl-validator.ts      # DSL validation
│   │   ├── form-generator.ts     # Form generation from schema
│   │   ├── queries.ts            # List database queries
│   │   └── tree-utils.ts         # List tree structure utilities
│   ├── mastodon/                 # Mastodon integration utilities
│   │   └── post-status.ts        # Post to Mastodon
│   ├── messages/                 # Message utilities
│   │   ├── link-detector.ts      # URL detection and platform identification
│   │   ├── linkify.tsx           # Link rendering component
│   │   ├── metadata-fetcher.ts   # Link metadata fetching (Open Graph, oEmbed)
│   │   └── queries.ts            # Message database queries
│   ├── organizations/            # Organization utilities
│   │   ├── queries.ts            # Organization database queries
│   │   └── utils.ts              # Slug generation, permissions
│   ├── theme/                    # Theme utilities
│   │   ├── darkone-bridge.ts     # DarkOne theme bridge
│   │   └── theme-sync.ts         # Theme sync across tabs
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts              # Shared types
│   ├── utils/                    # General utilities
│   │   ├── errors.tsx            # Error handling components
│   │   ├── message-extractor.ts  # Message content extraction
│   │   └── relativeTime.ts       # Relative time formatting
│   ├── help-config.ts            # Help system configuration
│   ├── help.ts                   # Help content loader
│   └── prisma.ts                 # Prisma Client singleton
├── prisma/                       # Prisma schema and migrations
│   ├── schema.prisma             # Database schema definition
│   └── migrations/               # Database migration files
│       ├── 20250210120000_add_linked_identities/
│       ├── 20251223015038_init_user/
│       ├── 20260104005203_add_theme_to_user/
│       ├── 20260104035743_add_password_reset_fields/
│       ├── 20260104140926_add_messages_and_max_length/
│       ├── 20260104235810_add_email_verification_fields/
│       ├── 20260106210211_add_default_publicly_visible/
│       ├── 20260120233430_add_lists_schema/
│       ├── 20260125002814_add_link_metadata_to_messages/
│       ├── 20260125040011_new_feautres/
│       ├── 20260125170624_add_view_preferences/
│       ├── 20260128161140_add_parent_list_relationship/
│       ├── 20260131110554_add_administrators/
│       ├── 20260202000000_add_follow_system/
│       ├── 20260203000000_add_user_location/
│       ├── 20260205143613_add_is_public_to_lists/
│       ├── 20260207015750_add_organizations/
│       ├── 20260207121021_add_active_to_user_organization/
│       ├── 20260207135000_add_show_advanced_post_settings/
│       ├── 20260208000000_add_message_image_urls/
│       ├── 20260211201345_add_message_video_urls/
│       ├── 20260212000000_add_cross_post_urls/
│       ├── 20260215000000_add_message_replies/
│       ├── 20260216000000_add_cleared/
│       ├── 20260217000000_add_email_change_fields/
│       ├── 20260218000000_add_list_watchers/
│       ├── 20260219000000_add_role_to_list_watcher/
│       ├── 20260220000000_add_documents_and_folders/
│       ├── 20260220000001_add_sync_tokens/
│       ├── 20260221000000_add_adron_as_public_owner/
│       ├── 20260222000000_add_email_logs/
│       ├── 20260223000000_add_from_email_to_email_log/
│       └── migration_lock.toml
├── public/                       # Static assets
│   ├── downloads/                # Pre-built CLI binaries (served statically)
│   │   ├── darwin-arm64/il-sync
│   │   ├── darwin-amd64/il-sync
│   │   ├── linux-amd64/il-sync
│   │   ├── linux-arm64/il-sync
│   │   └── windows/il-sync.exe
│   ├── fonts/                    # Custom fonts (Boxicons)
│   ├── images/                   # Image assets
│   │   ├── brands/               # Brand logos
│   │   ├── small/                # Small images
│   │   └── users/                # User avatars
│   ├── favicon.ico               # Favicon
│   ├── favicon.svg               # SVG favicon
│   ├── logo-*.svg                # Logo variants
│   └── manifest.json             # Web app manifest
├── scripts/                      # Utility scripts
│   ├── backup-database.js        # Database backup script
│   ├── cli-test-local.js         # CLI integration test runner (local dev)
│   ├── restore-database.js       # Database restore script
│   ├── safe-migrate.js           # Safe migration wrapper script
│   ├── seed-initial-data.js      # Seed "The Public" org and initial user
│   ├── seed-public-organization.js # Legacy script for seeding "The Public"
│   └── setup-database.sh         # Database setup automation
├── styles/                       # Global styles
│   └── darkone/                  # DarkOne theme styles
│       └── scss/                 # SCSS source files
│           ├── components/       # Component styles
│           ├── config/           # Theme configuration
│           ├── icons/            # Icon styles
│           ├── pages/            # Page-specific styles
│           ├── plugins/          # Plugin styles
│           └── structure/        # Layout structure styles
├── test-data/                    # Test data and seed scripts
│   ├── seed-test-accounts.js     # Seed 71 test user accounts and messages
│   └── README.md                 # Test data documentation
├── middleware.ts                 # Next.js middleware (auth, routing)
├── next.config.js                # Next.js configuration
├── package.json                  # Project dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Project documentation
```

### Key Directories Explained

- **`app/`**: Next.js 13+ App Router directory containing pages, API routes, and layouts. Uses file-based routing where each folder represents a route segment.

- **`app/api/`**: RESTful API endpoints organized by feature:
  - `admin/`: Admin-only endpoints for user management and email log access
  - `architecture-aggregates/`: Database schema introspection and aggregate data
  - `auth/`: Authentication endpoints (login, register, password reset, email verification, OAuth for Bluesky/GitHub/Mastodon, CLI sync tokens)
  - `documents/`: Document and folder CRUD operations, image upload, CLI sync endpoint
  - `exports/`: Data export endpoints (messages, lists, list data rows, follows)
  - `follow/`: Follow system (follow/unfollow, approve/reject requests, followers/following lists)
  - `images/`: Image proxy endpoints for external images (CORS bypass)
  - `lists/`: List CRUD operations, schema management, data row operations, watchers (access & permissions)
  - `location/`: Location widget API endpoint
  - `messages/`: Message CRUD operations, link metadata fetching, image/video upload, replies
  - `oauth/`: OAuth client metadata (Bluesky)
  - `organizations/`: Organization CRUD operations and member management
  - `user/`: Current user profile and settings management (avatar, email change, account deletion, linked identities)
  - `users/`: Public user lookup and public list access
  - `weather/`: Weather widget API endpoint
  - `test-db/`: Database connection testing utility

- **`components/`**: Reusable React components organized by feature:
  - Message-related: `MessageInput`, `MessageCard`, `MessageFeed`, `MessageList`, `MessageGrid`, `MessageTable`, `MessageReplies`, `ReplyInput`, `LinkMetadataCard`
  - List-related: `ListsTreeView`, `PublicListsTreeView`, `ListPreview`, `DynamicListForm`, `ListDataTable`, `ListSchemaForm`, `DeleteListButton`, `ListAccessSection`, `WatchedListsDataGrid`, `AddListWatcherButton`, and additional list detail/tree components
  - Organization-related: `OrganizationCard`, `OrganizationList`, `OrganizationMembers`, `OrganizationMembersDatagrid`, `OrganizationMembersManagement`, `CreateOrganizationForm`, `EditOrganizationForm`, `UserOrganizations`, `UserSelectionDatagrid`
  - Follow-related: `FollowButton`, `FollowersList`, `FollowingList`, `FollowRequests`, `FollowNavigation`
  - Document-related: `DocumentEditor`, `DocumentList`, `FolderTree`
  - Admin: `UserManagement`, `EmailLogTable`
  - Help: `HelpSidebar`, `HelpNavWrapper`
  - Architecture: `ArchitectureTabs`, `ERDDiagram`, `TableDataGrid`
  - Settings: `ConnectedAccountsSection`
  - UI components: `Avatar`, `AvatarPlaceholder`, `Navigation`, `NavigationTitle`, `Footer`, `Logo`, `UserDropdown`, `ProfileHeader`, `UserWallSidebar`, `ClearedStatusBanner`, `CrossPostErrorToast`
  - Widgets: `LocationWidget`, `WeatherWidget`
  - Feature-specific: `LeftSidebar`, `RightSidebar`, `EmailVerificationBanner`, `ThemeProvider`, `ThemeBridgeInit`

- **`DSL/`**: Domain Specific Language for defining dynamic list schemas:
  - `docs/`: Complete DSL documentation (syntax, field types, validation, conditional logic)
  - `examples/`: Ready-to-use DSL schema examples
  - `utilities/`: DSL builder API, transformers, and validators

- **`lib/`**: Shared utility functions and configurations:
  - `architecture-aggregates/`: Database schema introspection utilities
  - `auth/`: Authentication helpers (password hashing, session management, token generation, OAuth integrations for Bluesky/GitHub/Mastodon, admin access, sync tokens)
  - `avatar/`: Avatar image processing (resizing)
  - `bluesky/`: Bluesky cross-posting and session utilities
  - `config/`: Application configuration and constants (app settings, weather config)
  - `crosspost/`: Cross-posting utilities (text splitting, media distribution, platform follow checks)
  - `documents/`: Document utilities (queries, blob URL extraction for sync)
  - `email/`: Email sending utilities using Resend API, email logging, email link builder
  - `follows/`: Follow system database queries
  - `lists/`: List utilities (DSL parsing, validation, form generation, queries, tree structure, date handling)
  - `mastodon/`: Mastodon cross-posting utilities
  - `messages/`: Message utilities (link detection, metadata fetching, link rendering, queries)
  - `organizations/`: Organization utilities (queries, permissions, slug generation)
  - `theme/`: Theme management and DarkOne theme integration, cross-tab theme sync
  - `types/`: Shared TypeScript type definitions
  - `utils/`: General utility functions (time formatting, error handling, message extraction)
  - `help-config.ts`: Help system navigation configuration
  - `help.ts`: Help content loader (reads markdown from `documentation/help/`)
  - `prisma.ts`: Prisma Client singleton instance

- **`prisma/`**: Database schema and migrations:
  - `schema.prisma`: Type-safe database schema definition
  - `migrations/`: Version-controlled database migration history

- **`public/`**: Static assets served directly by Next.js (images, fonts, favicons)

- **`styles/`**: Global stylesheets and theme files (DarkOne SCSS framework)

- **`scripts/`**: Automation scripts for database setup and other tasks
  - `setup-database.sh`: Automated database setup (user, database, migrations, initial seed)
  - `seed-initial-data.js`: Seed initial data ("The Public" organization and seed user)
  - `seed-public-organization.js`: Legacy script for seeding "The Public" organization
  - `backup-database.js`: Database backup automation
  - `restore-database.js`: Database restore automation
  - `safe-migrate.js`: Safe migration wrapper (used by `npm run db:migrate`)
  - `cli-test-local.js`: CLI integration test runner against a local dev server

- **`test-data/`**: Test seed scripts and documentation for local development
  - `seed-test-accounts.js`: Seeds 71 test user accounts and thousands of test messages
  - `README.md`: Test data documentation

- **`documentation/`**: Project documentation (markdown)
  - `app-api-arch/`: Architecture, API reference, and application design docs
  - `help/`: In-app help content rendered by the `/help/` pages
  - `tooling/`: CLI download, installation, and local testing guides
  - `admin/`: Admin feature documentation

## Database

The application uses Prisma as the ORM with PostgreSQL. The database schema is defined in `prisma/schema.prisma`.

### Database Schema

The application includes the following models:

- **User**: User accounts with authentication, profile, and preferences
  - Authentication: email, username, password hash
  - Profile: display name, avatar, bio
  - Preferences: theme (system/light/dark), max message length, default message visibility
  - View Preferences: messages per page (10-30), viewing preference (my_messages/all_messages/followers_only/following_only), show previews toggle
  - Security: email verification, password reset tokens
- **Message**: Time-series messages posted by users
  - Content: message text with user-defined length limits
  - Visibility: public or private (defaults to user's preference)
  - Link Metadata: JSONB field storing metadata for links in messages (thumbnails, descriptions, etc.)
  - Relationships: linked to user with cascade delete, can be associated with lists
  - Indexes: optimized for createdAt and publiclyVisible queries
- **List**: Dynamic lists created by users with custom schemas
  - Schema: JSONB metadata field storing DSL-defined schema
  - Properties: Related ListProperty records defining fields
  - Data Rows: Related ListDataRow records storing actual data
  - Watchers: Related ListWatcher records for access and permissions
  - Relationships: linked to user and optionally to a message
  - Soft deletes: deletedAt timestamp for soft deletion
- **ListWatcher**: List access and permissions (public lists only)
  - Roles: watcher (follow), collaborator (add/edit/delete rows), manager (collaborator + edit schema)
  - Unique on [userId, listId]
- **ListProperty**: Field definitions for lists
  - Defines field types, validation rules, display order, visibility conditions
  - Supports conditional logic and field dependencies
- **ListDataRow**: Data rows within lists
  - Stores JSONB rowData matching the list's schema
  - Supports row numbering and soft deletes
- **Organization**: Organizations that users can belong to
  - Properties: name, slug, description, avatar, public/private visibility
  - System organizations: Special organizations like "The Public" that cannot be deleted
  - Settings: JSONB field for flexible configuration
  - Soft deletes: deletedAt timestamp for soft deletion
- **UserOrganization**: Many-to-many relationship between users and organizations
  - Roles: owner, admin, member (with hierarchical permissions)
  - Tracks when users joined organizations
  - Unique constraint prevents duplicate memberships
- **Follow**: Follower/following relationships between users
  - Status: pending (requires approval) or active
  - Unique on [followerId, followingId]
- **Administrator**: Marks users as platform administrators
  - Linked to a User record
- **SyncToken**: CLI sync tokens for authenticating the `il-sync` daemon
  - Linked to a User record; used instead of session cookies for CLI access
- **LinkedIdentity**: Linked social/OAuth provider identities
  - Stores provider type (bluesky, github, mastodon), provider user ID, and provider-specific data
- **Folder**: Document folders for organizing documents
  - Supports nested folders via self-referential parent/child relationships
  - Linked to a User record
- **Document**: Markdown documents with folder organization
  - Content stored as markdown text with optional blob image URLs
  - Linked to a User and optionally to a Folder
  - Supports sync via the CLI daemon
- **EmailLog**: Log of all emails sent by the application
  - Stores recipient, subject, template type, timestamp, and status

### Database Migrations

#### Local Development

To create and apply migrations locally:

```bash
# Create a new migration (after modifying schema.prisma)
npm run db:migrate

# This will:
# 1. Create a new migration file in prisma/migrations/
# 2. Apply it to your local database
# 3. Regenerate the Prisma Client
```

**Note**: The `db:migrate` script uses a safe migration wrapper that:
- Checks migration status before proceeding
- Uses `prisma migrate deploy` to safely apply pending migrations (non-destructive)
- Only uses `prisma migrate dev` when safe (no migration mismatches)
- Prevents destructive database resets
- Creates new migration files based on schema changes when appropriate
- Regenerates the Prisma Client automatically

If you encounter migration history mismatches, the script will:
1. Attempt to resolve by applying pending migrations safely
2. Provide clear error messages and options if resolution fails
3. Prevent database resets unless explicitly using `db:migrate:force`

#### Production Deployment

To apply migrations to production:

```bash
# Apply pending migrations to production database
npm run db:migrate:deploy

# Or directly:
npx prisma migrate deploy
```

**Important**: `prisma migrate deploy`:
- Only applies existing migrations (doesn't create new ones)
- Safe to run in production
- Reads from `DATABASE_URL` environment variable
- Does NOT regenerate Prisma Client (use `prisma generate` separately if needed)

**For Vercel Deployments**: Migrations run automatically during build via the `vercel-build` script:
```json
"vercel-build": "prisma migrate deploy && next build"
```

#### Migration Workflow

1. **Make schema changes** in `prisma/schema.prisma`
2. **Create migration locally**:
   ```bash
   npm run db:migrate
   ```
   The safe migration script will:
   - Check migration status
   - Apply any pending migrations safely (if needed)
   - Create a new migration file with a timestamp (e.g., `20260104235810_add_email_verification_fields`)
   - Apply it to your local database
   - Regenerate Prisma Client
3. **Test locally** to ensure everything works
4. **Commit migration files** to git (they're in `prisma/migrations/`)
5. **Deploy to production**:
   - Vercel: Migrations run automatically during build
   - Manual: Run `npm run db:migrate:deploy` with production `DATABASE_URL`

**Safety Features:**
- The `db:migrate` script prevents destructive database resets
- If migration history mismatches are detected, it attempts safe resolution
- Only uses `prisma migrate dev` when it's safe (no conflicts)
- Provides clear error messages and guidance if issues occur

### Viewing the Database

To open Prisma Studio and browse your database:

```bash
npm run db:studio
```

This will open a web interface at `http://localhost:5555` where you can view and edit your database.

### Database Backups

The project includes an automated backup script that creates SQL dumps of both production and local development databases.

#### Running Backups

To create backups of your databases:

```bash
npm run backup
```

Or run the script directly:

```bash
node scripts/backup-database.js
```

#### What Gets Backed Up

The script automatically backs up:

1. **Production Database** - Reads `DATABASE_URL` from `.env` file
2. **Local Development Database** - Reads `DATABASE_URL` from `.env.local` file

#### Backup Location

Backups are saved to a `BACKUP` folder in your Downloads directory:
- **macOS**: `~/Downloads/BACKUP/`
- **Linux**: `~/Downloads/BACKUP/` (or `$XDG_DOWNLOAD_DIR/BACKUP/` if set)
- **Windows**: `%USERPROFILE%\Downloads\BACKUP\`

The script automatically creates the BACKUP directory if it doesn't exist.

#### Backup File Naming

Backup files are named with timestamps for easy identification:
- Production: `backup_production_YYYY-MM-DD_HH-MM-SS.sql`
- Local: `backup_local_YYYY-MM-DD_HH-MM-SS.sql`

Example: `backup_production_2024-01-15_14-30-00.sql`

#### Prerequisites

- **PostgreSQL client tools** must be installed (includes `pg_dump`)
  - macOS: `brew install postgresql`
  - Linux: `sudo apt-get install postgresql-client` (Debian/Ubuntu) or `sudo yum install postgresql` (RHEL/CentOS)
  - Windows: Install PostgreSQL from https://www.postgresql.org/download/windows/

#### Notes

- The script will skip backups if `.env` or `.env.local` files are missing
- If `DATABASE_URL` is not found in a file, that backup will be skipped with a warning
- Backups are created in plain SQL format and can be restored using `psql` or Prisma migrations
- The script provides colored output indicating success, warnings, and errors

### Testing Database Connection

A test API endpoint is available at `/api/test-db` to verify your database connection is working correctly.

## Features

### Core Features

- **User Authentication**: Registration, login, and session management
- **Email Verification**: Email verification workflow with resend capability (rate limited to 10 minutes)
- **Password Reset**: Secure password reset via email
- **Theme Management**: System, light, and dark theme support
- **Message Posting**: Time-series based micro-blogging (Mastodon-like)
  - Customizable character limits per user (default: 666 characters)
  - Public/private message visibility with per-user default preference
  - Default visibility setting: Messages default to the user's preference, which itself defaults to private (not public)
  - Email verification required to post messages
- **User Profiles**: Customizable display names, avatars, and bios
- **User Settings**: Comprehensive settings management
  - Profile customization (display name, bio, avatar)
  - Theme preferences (system, light, dark)
  - Message length limits
  - Default message visibility preference (public/private)
  - View Preferences:
    - Messages per page (10-30, default: 20)
    - Viewing preference (My Messages, All Messages, Followers Only, Following Only)
    - Show/hide link previews toggle
- **Dynamic Lists**: Create custom lists with dynamic schemas using DSL
  - Define custom fields with types, validation, and conditional logic
  - Form generation from schema definitions
  - Data management with CRUD operations
  - List navigation via tree view
  - Link lists to messages for context
- **Organizations**: Multi-user organization system
  - Users can belong to multiple organizations simultaneously
  - Role-based permissions (owner, admin, member)
  - Public/private organizations (public = anyone can see/join)
  - "The Public" system organization that all users belong to by default
  - Organization management (create, edit, delete, manage members)
  - Member management (add, remove, change roles)
  - Slug-based URLs for organization pages
- **Link Previews**: Automatic link detection and rich preview generation
  - Supports Instagram, Blue Sky, Threads, Mastodon, and general URLs
  - Automatic metadata fetching (Open Graph, oEmbed, platform-specific APIs)
  - Thumbnail images and descriptions
  - Asynchronous background processing
  - Client-side toggle to show/hide previews
  - Image proxy for Instagram (CORS bypass)
- **Widgets**: Interactive sidebar widgets
  - Location widget (geolocation-based)
  - Weather widget (location-based weather)
- **Organizations Pages**: Organization browsing and management
  - Organizations list page (`/organizations`)
  - Organization detail pages (`/organizations/[slug]`)
  - Organization edit page (`/organizations/[slug]/edit`)
  - User's organizations page (`/user/organizations`)
  - Create organization page (`/organizations/new`)
- **Follow System**: Social follow relationships between users
  - Follow/unfollow users
  - Pending follow requests with approve/reject workflow
  - Followers and following lists per user
  - Mutual follow detection
  - Follow-based message filtering (Followers Only / Following Only views)
- **User Profiles**: Public user profile walls
  - Profile pages at `/user/[username]`
  - Follower and following pages
  - User's public lists
- **People Directory**: Browse all users at `/people`
- **Message Replies**: Threaded replies to messages
  - Reply to any message
  - Thread view at `/message/[id]/thread`
- **Image and Video Uploads**: Attach media to messages
  - Image upload via Vercel Blob storage
  - Video upload via Vercel Blob storage
  - Image proxy for external images (CORS bypass)
- **Cross-posting**: Post to external social platforms
  - Cross-post to Bluesky
  - Cross-post to Mastodon
  - Platform follow detection
  - Text splitting for platform character limits
- **OAuth Account Linking**: Link external social accounts
  - Bluesky OAuth 2.0 (PKCE)
  - GitHub OAuth
  - Mastodon OAuth
  - Linked identities management in Settings
- **Documents**: Markdown document management
  - Create, view, and edit markdown documents
  - Organize documents into nested folders
  - Document editor with markdown preview
  - Sync documents to/from local filesystem via `il-sync` CLI
- **Exports**: Data export feature
  - Export messages, lists, list data rows, and follows
  - Accessible at `/exports`
- **Admin Panel**: Admin-only management features
  - User management (list, create, edit, bulk operations)
  - Email log viewer
  - Support links management
  - Accessible at `/admin`
- **Help System**: In-app help pages
  - Markdown-driven help content from `documentation/help/`
  - Help sidebar with navigation
  - Accessible at `/help/[slug]`
- **Architecture Visualizer**: Database schema and aggregate visualization
  - ERD diagram of the database schema
  - Per-table data grid views
  - Accessible at `/architecture-aggregates`
- **Email Change Workflow**: Users can change their email address
  - Change email request with verification link
  - Confirmation page at `/verify-email-change`

### Security Features

- Password hashing with bcrypt
- Email verification required for posting messages
- Rate limiting on email resend (10 minutes)
- Secure token generation for password resets and email verification
- Session-based authentication with httpOnly cookies
- OAuth 2.0 (PKCE) for Bluesky account linking
- Admin access control with Administrator model
- CLI sync token authentication (separate from session cookies)

## Environment Variables

### Required Variables

- `DATABASE_URL` - PostgreSQL connection string
- `RESEND_API_KEY` - Resend API key for sending emails
- `NODE_ENV` - Node environment (development/production)

### Optional Variables

- `RESEND_FROM_EMAIL` - Email address to send from (defaults to `onboarding@resend.dev`)
- `NEXT_PUBLIC_APP_URL` - Application URL for email links (auto-detected on Vercel via `VERCEL_URL`, defaults to `http://localhost:3000` in development)
- `APP_NAME` - Application name (defaults to `InterlinedList`)
- `APP_CONTACT_EMAIL` - Contact email for User-Agent header (defaults to `contact@interlinedlist.com`)
- `APP_USER_AGENT` - Custom User-Agent string for external API calls (defaults to auto-generated based on app name and contact email)
- `SESSION_COOKIE_NAME` - Session cookie name (defaults to `session`)
- `SESSION_MAX_AGE` - Session max age in seconds (defaults to `604800` = 7 days)
- `BLUESKY_CLIENT_ID` - Bluesky OAuth client metadata URL (optional; defaults to `{NEXT_PUBLIC_APP_URL}/api/oauth/client-metadata`)
- `GITHUB_CLIENT_ID` - GitHub OAuth app client ID (for GitHub account linking)
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app client secret
- `MASTODON_CLIENT_ID` - Mastodon OAuth app client ID
- `MASTODON_CLIENT_SECRET` - Mastodon OAuth app client secret
- `MASTODON_INSTANCE_URL` - Mastodon instance URL (e.g. `https://mastodon.social`)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token (for image and video uploads)

**Note**: See `.env.example` for a complete template. Environment variables should be set in `.env` or `.env.local` (both are gitignored).

### Bluesky OAuth

Bluesky account linking uses OAuth 2.0. The client metadata URL is auto-derived from `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000/api/oauth/client-metadata` for local dev). **Important**: Bluesky's servers must be able to fetch this URL. For local development, use a tunnel (e.g. [ngrok](https://ngrok.com)) and set `NEXT_PUBLIC_APP_URL` to your tunnel URL, or set `BLUESKY_CLIENT_ID` explicitly.

### Local Development

Create a `.env.local` file in the project root:

```env
DATABASE_URL="postgresql://interlinedlist:interlinedlist_dev_password@localhost:5432/interlinedlist?schema=public"
RESEND_API_KEY="your_resend_api_key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### Email Configuration

The application uses [Resend](https://resend.com) for sending emails. To set up:

1. **Create a Resend account** at https://resend.com
2. **Get your API key** from the Resend dashboard
3. **Add it to your environment variables**:
   - Local: Add to `.env.local`
   - Production: Add to Vercel environment variables

**Note**: The `NEXT_PUBLIC_APP_URL` is automatically detected on Vercel using the `VERCEL_URL` environment variable. For local development, set it to `http://localhost:3000`.

## Deployment

### Deploying to Vercel

#### 1. Set Up Remote Database

For production deployment, you'll need a remote PostgreSQL database. Popular options include:
- **Vercel Postgres** (integrated with Vercel)
- **Neon** (serverless PostgreSQL)
- **Supabase** (PostgreSQL with additional features)
- **Railway** (PostgreSQL hosting)
- **AWS RDS** (managed PostgreSQL)

**Using the setup script with a remote database:**

The `setup-database.sh` script can be adapted for remote databases. You'll need to:

1. **Modify the script variables** at the top of `scripts/setup-database.sh`:
   ```bash
   DB_USER="your_remote_db_user"
   DB_PASSWORD="your_remote_db_password"
   DB_NAME="your_remote_db_name"
   DB_HOST="your_remote_db_host"  # e.g., "ep-cool-name-123456.us-east-1.aws.neon.tech"
   DB_PORT="5432"  # Usually 5432 for PostgreSQL
   ADMIN_USER="your_admin_user"  # Usually the same as DB_USER for managed services
   ```

2. **Ensure you have PostgreSQL client tools installed** (`psql`, `pg_isready`)

3. **Run the script** (it will connect to your remote database):
   ```bash
   ./scripts/setup-database.sh
   ```

**Alternative: Manual remote database setup**

If you prefer to set up the remote database manually:

1. **Create the database user** (if your provider allows):
   ```sql
   CREATE USER your_db_user WITH PASSWORD 'your_secure_password';
   ALTER USER your_db_user CREATEDB;
   ```

2. **Create the database**:
   ```sql
   CREATE DATABASE your_db_name OWNER your_db_user;
   GRANT ALL PRIVILEGES ON DATABASE your_db_name TO your_db_user;
   ```

3. **Run migrations** using your remote `DATABASE_URL`:
   ```bash
   DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public" npm run db:migrate
   ```

#### 2. Configure Vercel Environment Variables

After setting up your remote database, configure environment variables in Vercel:

1. **Go to your Vercel project dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project (or create a new one)

2. **Open Project Settings**
   - Click on your project
   - Go to **Settings** tab
   - Click on **Environment Variables** in the left sidebar

3. **Add Required Environment Variables**

   Click **Add New** and add each variable:

   **`DATABASE_URL`** (Required)
   - **Key:** `DATABASE_URL`
   - **Value:** Your remote PostgreSQL connection string
     ```
     postgresql://user:password@host:5432/dbname?schema=public
     ```
   - **Environment:** Select all environments (Production, Preview, Development)
   - **Note:** Make sure to include `?schema=public` at the end

   **`NODE_ENV`** (Optional, but recommended)
   - **Key:** `NODE_ENV`
   - **Value:** `production`
   - **Environment:** Production only

4. **Save and Redeploy**
   - Click **Save** after adding each variable
   - Vercel will automatically trigger a new deployment
   - Or manually trigger a redeploy from the **Deployments** tab

#### 3. Vercel Build Configuration

Vercel will automatically detect Next.js and run the build. However, you may need to ensure Prisma generates the client during build:

**Add a `vercel.json` file** (optional, if needed):

```json
{
  "buildCommand": "npm run db:generate && npm run build"
}
```

Or ensure your `package.json` has a `postinstall` script:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

#### 4. Configure Email Environment Variables

Add the following environment variables in Vercel:

**`RESEND_API_KEY`** (Required)
- **Key:** `RESEND_API_KEY`
- **Value:** Your Resend API key from https://resend.com
- **Environment:** All environments (Production, Preview, Development)

**`RESEND_FROM_EMAIL`** (Optional)
- **Key:** `RESEND_FROM_EMAIL`
- **Value:** Your verified sender email (e.g., `noreply@yourdomain.com`)
- **Environment:** All environments
- **Note:** Defaults to `onboarding@resend.dev` if not set

**`NEXT_PUBLIC_APP_URL`** (Optional for Vercel)
- **Key:** `NEXT_PUBLIC_APP_URL`
- **Value:** Your production domain (e.g., `https://yourdomain.com`)
- **Environment:** Production only
- **Note:** Automatically detected on Vercel via `VERCEL_URL`, but you can override for custom domains

#### 5. Run Migrations on Vercel

Migrations run automatically during Vercel deployments via the `vercel-build` script:

```json
"vercel-build": "prisma migrate deploy && next build"
```

This ensures your production database is always up-to-date with the latest schema changes.

**Manual Migration (if needed):**

If you need to run migrations manually:

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   vercel link
   ```

4. **Pull environment variables**:
   ```bash
   vercel env pull .env.local
   ```

5. **Run migrations**:
   ```bash
   npm run db:migrate:deploy
   ```

**Note**: Use `db:migrate:deploy` (not `db:migrate`) for production, as it only applies existing migrations without creating new ones.

#### 5. Verify Deployment

1. **Check build logs** in Vercel dashboard to ensure migrations ran successfully
2. **Test your application** at your Vercel URL
3. **Verify database connection** by checking if data persists

### Important Notes for Production

- **Never commit `.env.local`** - It's already in `.gitignore`
- **Use strong passwords** for production databases
- **Enable SSL** for database connections (most providers do this by default)
- **Set up database backups** through your provider
- **Monitor database performance** and scale as needed
- **Use connection pooling** for better performance (most managed providers handle this)
- **Verify your Resend sender email** before deploying to production
- **Set `NEXT_PUBLIC_APP_URL`** for custom domains (or rely on Vercel's auto-detection)

## Recent Updates

### Email Verification System
- Complete email verification workflow with token-based verification
- Rate-limited resend functionality (10 minutes between requests)
- Email verification required to post messages
- Verification banners and settings integration

### Message Posting Feature
- Time-series message feed (Mastodon-like)
- Customizable character limits per user (default: 666)
- Public/private message visibility with per-user default preference
- Messages default to the user's preference, which itself defaults to private (not public)
- Three-column responsive layout
- Dashboard view with paginated message grid
- Pagination respects user's messagesPerPage setting (10-30)
- "Show More Messages" button loads configured number of messages

### Link Previews Feature
- Automatic URL detection in message content
- Rich preview cards for Instagram, Blue Sky, Threads, Mastodon, and general URLs
- Asynchronous metadata fetching (Open Graph, oEmbed, platform-specific APIs)
- Thumbnail images and descriptions displayed inline
- Client-side toggle to show/hide previews
- Image proxy endpoint for Instagram images (CORS bypass)
- Auto-polling for pending metadata updates

### Dynamic Lists Feature
- Domain Specific Language (DSL) for defining list schemas
- Custom field types (text, email, number, select, date, etc.)
- Validation rules and conditional field visibility
- Form generation from schema definitions
- CRUD operations for list data
- Tree view navigation for lists
- Link lists to messages for context
- Soft delete support

### View Preferences
- Messages per page setting (10-30, default: 20)
- Viewing preference options (My Messages, All Messages, Followers Only, Following Only)
- Show/hide link previews toggle
- Settings persist across sessions
- Quick toggle on main page for preview visibility

### Organizations Feature
- Multi-user organization system with role-based permissions
- Users can belong to multiple organizations simultaneously
- "The Public" system organization that all users belong to by default
- Public/private organizations (public = anyone can see/join)
- Organization management (create, edit, delete, manage members)
- Member management (add, remove, change roles: owner, admin, member)
- Slug-based URLs for organization pages
- Organization pages: list, detail, user's organizations, create
- Automatic membership in "The Public" organization for new users

### Follow System
- Follow/unfollow users
- Pending follow requests with approve/reject workflow
- Followers and following pages per user
- Mutual follow detection
- Follow-based message filtering in viewing preferences

### Admin Panel
- User management (list, view, create, bulk operations: status, clearance, delete)
- Email log viewer for sent emails
- Admin access controlled via Administrator model

### Documents Feature
- Create, view, and edit markdown documents
- Nested folder organization
- Image upload and embedding (stored in Vercel Blob)
- CLI sync daemon (`il-sync`) for local filesystem sync

### OAuth and Cross-posting
- Bluesky OAuth 2.0 (PKCE) account linking
- GitHub OAuth account linking
- Mastodon OAuth account linking
- Cross-post messages to Bluesky and Mastodon
- Platform follow detection and media distribution

### Message Enhancements
- Image and video attachments (uploaded to Vercel Blob)
- Threaded replies with thread view page
- Cross-post status URLs stored with messages

### Email Change Workflow
- Users can request an email address change
- Verification link sent to new email address
- Confirmation page to complete the change

### Database Migrations
- `20250210120000_add_linked_identities` - LinkedIdentity table for OAuth provider accounts
- `20251223015038_init_user` - Initial user schema
- `20260104005203_add_theme_to_user` - Theme preferences
- `20260104035743_add_password_reset_fields` - Password reset functionality
- `20260104140926_add_messages_and_max_length` - Messages table and character limits
- `20260104235810_add_email_verification_fields` - Email verification tokens
- `20260106210211_add_default_publicly_visible` - User default message visibility preference
- `20260120233430_add_lists_schema` - Lists, ListProperty, and ListDataRow tables
- `20260125002814_add_link_metadata_to_messages` - Link metadata JSONB field for messages
- `20260125040011_new_feautres` - Index optimizations
- `20260125170624_add_view_preferences` - User view preferences (messagesPerPage, viewingPreference, showPreviews)
- `20260128161140_add_parent_list_relationship` - Parent/child list hierarchy
- `20260131110554_add_administrators` - Administrator model for admin access control
- `20260202000000_add_follow_system` - Follow and follow request tables
- `20260203000000_add_user_location` - User location fields
- `20260205143613_add_is_public_to_lists` - Public/private flag on lists
- `20260207015750_add_organizations` - Organizations and UserOrganization tables with "The Public" seed data
- `20260207121021_add_active_to_user_organization` - Active flag on user organization membership
- `20260207135000_add_show_advanced_post_settings` - Advanced post settings preference
- `20260208000000_add_message_image_urls` - Image URL array on messages
- `20260211201345_add_message_video_urls` - Video URL array on messages
- `20260212000000_add_cross_post_urls` - Cross-post status URL fields on messages
- `20260215000000_add_message_replies` - Message reply relationships
- `20260216000000_add_cleared` - Cleared/suspended status for users
- `20260217000000_add_email_change_fields` - Email change token fields on users
- `20260218000000_add_list_watchers` - ListWatcher table for list access and permissions
- `20260219000000_add_role_to_list_watcher` - Role field on ListWatcher
- `20260220000000_add_documents_and_folders` - Document and Folder tables
- `20260220000001_add_sync_tokens` - SyncToken table for CLI authentication
- `20260221000000_add_adron_as_public_owner` - Seed migration for initial owner assignment
- `20260222000000_add_email_logs` - EmailLog table for sent email tracking
- `20260223000000_add_from_email_to_email_log` - From email field on EmailLog
