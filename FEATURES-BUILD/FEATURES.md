# InterlinedList — Feature Map & Mission Analysis

---

## Mission Statement

InterlinedList is a **personal productivity and social publishing platform** that unifies micro-blogging, structured data management, and long-form documentation in a single environment — while connecting outward to external social networks. The core thesis is that thoughts, tasks, data, and references are not separate concerns: a message can spawn a list, a list can track GitHub issues, a document can contextualize both, and all of it can be published to the world or shared selectively with a team.

The platform is designed for individuals and small organizations who think in notes, track things in lists, and want to publish ideas across the social web — without context-switching between five different tools.

---

## Current Features

### 1. Messaging (Micro-blogging)

The home page and dashboard both expose a message feed. Messages are short-form posts (up to 666 characters, adjustable per user) with support for images (up to 8), video (1), and link detection with Open Graph metadata preview.

**What it supports:**
- Public and private messages (per-post visibility)
- Reply threading (messages can have child replies)
- "Dig" engagement (equivalent to a like)
- "Push" — a repost mechanism that creates a new message pointing at the original, preserving attribution
- Tag filtering on the feed
- Link URL auto-detection with async OG metadata fetching
- Scheduled posting (set a future publish time)
- A viewing preference to see all public messages, only followed users, or both

Messages are the connective tissue of the platform. A message can be attached to a list, effectively linking structured data to a conversational moment. The feed is paginated with lazy loading.

### 2. Cross-Posting to External Networks

Users who connect external OAuth accounts can cross-post messages simultaneously to:

- **Mastodon** (any instance the user authenticates with)
- **Bluesky** (via ATProto OAuth)
- **LinkedIn**

Cross-posting is configured per message at write time. Each platform returns a URL and status ID that is stored on the message, so the original post and all its copies are linked. Reply threading is supported: if both the author and the recipient are followed on a given platform, replies can thread correctly across those platforms.

Scheduled messages carry the cross-post configuration and are published by a Vercel Cron job at the scheduled time.

**How it connects:** Cross-posting is downstream of the messaging feature. It relies on the OAuth integration system (see §5) for credentials and the scheduling cron for deferred delivery.

### 3. Structured Lists (Data Management)

The Lists feature is the namesake of the platform and is gated behind a paid subscription. Lists are user-defined relational tables with a schema defined in a lightweight DSL.

**Schema DSL example:**
```
Name:text, Status:select[Open,Closed], Priority:select[Low,Med,High], Due:date
```

**What it supports:**
- Custom field types: text, number, date, select, boolean, URL, markdown
- Required fields, default values, validation rules
- Conditional field visibility (`visibilityCondition`)
- Hierarchical lists: a list can be a child of another list (tree structure)
- List connections: directed edges between lists with optional labels, visualized as a flow diagram
- List watchers with roles: watcher (read-only), collaborator (data entry), manager (schema changes)
- Multiple views: card view, data grid, tree, and ERD diagram
- GitHub-backed lists: sync a list's rows from GitHub issues in a repository
- Soft-delete on rows and lists

A list can be linked to a message, meaning the structured data has an associated conversational thread. Lists can be public (visible on user profiles) or private.

**How it connects:** Lists are tightly connected to GitHub (§7), Documents (§4), and Messages (§1). A message can carry a list attachment. A list can be watched by other users (social layer). The list ERD view uses the same ReactFlow component as the architecture visualization tool in the admin area.

### 4. Documents (Long-Form Writing)

The Documents feature provides a full Markdown editor for longer-form content. Documents are organized into folders in a tree structure and can be public or private.

**What it supports:**
- Rich Markdown editing (`@uiw/react-md-editor`)
- Folder hierarchy with nested subfolders
- Image upload (stored in Vercel Blob)
- Document templates with seed defaults
- File-based sync (for importing `.md` files)
- Per-document public/private visibility

Documents exist somewhat independently of messages and lists today. They represent the "long form" counterpart to messages' "short form," and the folder structure mirrors the list hierarchy concept.

**How it connects:** Documents share the folder/tree paradigm with lists. They can be made public and appear on user profiles alongside public lists. The Markdown content model overlaps with the `row-to-markdown.ts` export utilities in lists.

### 5. OAuth Integrations & Identity Linking

Users can connect external accounts for two purposes: **social cross-posting** (Mastodon, Bluesky, LinkedIn) and **data integration** (GitHub). These linked identities store provider tokens and are used throughout the platform.

**What it supports:**
- Connect/disconnect per provider on the `/integrations` page
- Multiple Mastodon instances per user
- GitHub: default repo setting, access to issues, labels, assignees
- LinkedIn: posting via OAuth
- Identity verification: re-check that the linked account is still valid
- Storage of user-supplied API keys: OpenAI and Anthropic (for future AI features)

**How it connects:** OAuth accounts feed directly into cross-posting (§2) and GitHub lists (§3). The AI API keys are stored but not yet wired to user-facing features.

### 6. Follow System & Social Graph

Users can follow each other to shape their feed. Accounts can be public (auto-approved follows) or private (follow requests require approval).

**What it supports:**
- Follow / unfollow with pending state for private accounts
- Approve or reject follow requests from `/people`
- Remove a follower from your own followers list
- Mutual follow detection (used for cross-post reply threading)
- Public follower/following counts on user profiles
- Feed filtering: all public messages, followed-only, or both

**How it connects:** The follow graph filters the message feed, drives cross-post reply threading logic, and determines what content private-account users can see. It is also exportable via the data exports feature (§10).

### 7. GitHub Integration

Beyond OAuth account linking, GitHub is integrated at a deeper data level.

**What it supports:**
- Browse your GitHub repositories and select a default
- Create GitHub issues directly from the platform
- Comment on GitHub issues
- GitHub-backed lists: a list that syncs its rows from a repository's issues (cron-refreshed)
- Fetch repo labels and assignees for use in list schemas

**How it connects:** GitHub issues become list data rows. This is the first example of an external data source being pulled into the structured list model.

### 8. Subscription & Payments (Stripe)

A freemium model gates several features behind a paid subscription.

**Free tier capabilities:**
- Messaging (text only, no media)
- Viewing public content
- Following users
- Basic profile

**Subscriber capabilities (monthly $6.99 / annual $60):**
- Lists (creation and management)
- Documents
- Image and video uploads on messages
- Message scheduling
- Cross-posting to external networks
- Organizations

The subscription is managed via Stripe Checkout and the Stripe Customer Portal. A webhook keeps the platform's subscription status in sync with Stripe.

**How it connects:** The subscription status is checked at every subscriber-gated API endpoint and UI route. It is the primary business model of the platform.

### 9. Organizations

Users can create organizations with member management. An organization has a public profile, a slug-based URL, and role-based membership (owner, admin, member).

**What it supports:**
- Public and private organizations
- Member invitations and role assignment
- A system organization ("The Public") that determines admin access
- Organization profile pages with member lists

Organizations are currently mostly structural — a way to group users. The platform's admin panel is accessed by being an owner of the system "The Public" organization.

**How it connects:** Organization membership determines admin access (§11). Organizations are gated behind subscriptions (§8). The concept of collaborative ownership of lists (via watchers) partially overlaps the org model but is not directly connected.

### 10. Data Exports

All user data is exportable from `/exports`.

**What it supports:**
- Messages as CSV or JSON
- Lists as CSV or JSON
- List data rows as CSV or JSON
- Follow relationships as CSV or JSON

**How it connects:** Exports touch all four primary data types (messages, lists, documents-adjacent, follows). They serve as a data portability layer.

### 11. Admin Panel

A platform administration interface accessible only to owners of the "The Public" system organization.

**What it supports:**
- Full user management: view, create, edit, bulk status updates, bulk delete, clear users
- Email delivery log with status, recipient, provider ID, and error messages
- Platform analytics: page views, events by type, user activity
- Support links management
- Architecture aggregates: live database table row counts, full schema visualization, ERD of the Prisma model

**How it connects:** Admin wraps everything else. The analytics system is fed by a client-side tracker injected into every page. The email logs come from Resend webhooks. The architecture view parses the live Prisma schema.

### 12. Notifications

An in-app notification tray (bell icon in nav) with a per-user configurable limit.

**What it supports:**
- Notifications for message pushes (reposts) of your content
- Mark individual or all notifications as read
- Notification count badge on the bell icon

**How it connects:** Notifications are triggered by message interactions (pushes/reposts). They are a lightweight event layer that currently covers only one interaction type.

### 13. Settings & Preferences

A comprehensive `/settings` page gives users control over their experience.

**What it covers:**
- Display name, username, bio, avatar (upload or URL)
- Email change with verification
- Password change
- Theme (light/dark)
- Location (lat/lng for weather widget)
- Message length limit (personal override)
- Messages per page
- Default message visibility (public/private)
- Advanced post settings toggle
- Show/hide link previews
- Notification tray limit
- Account privacy (private/public)
- Subscription status
- Permissions section
- Danger zone: delete account

### 14. Ambient / Contextual Widgets

The home page right sidebar shows live contextual information:
- **Weather widget**: uses the user's stored location and a weather API
- **Clock/time widget**: current time
- **Location widget**: display of the user's location

A full-screen analog clock is available at `/clock`. These features suggest the platform was intended as a personal ambient dashboard, not just a social feed.

### 15. CLI / API Sync Token

Users can generate a sync token for use with a CLI or external API client. The token is validated server-side and allows programmatic access to the platform under the user's identity.

---

## How the Features Connect (Feature Graph)

```
                         ┌──────────────┐
                         │  Subscription │
                         │   (Stripe)    │
                         └──────┬───────┘
                                │ gates
           ┌────────────────────┼──────────────────────┐
           ▼                    ▼                       ▼
     ┌──────────┐         ┌──────────┐           ┌──────────────┐
     │ Messages │         │  Lists   │           │  Documents   │
     └────┬─────┘         └────┬─────┘           └──────┬───────┘
          │ can attach to      │ syncs from              │ organized by
          │                    ▼                         ▼
          │             ┌──────────────┐           ┌──────────┐
          │             │   GitHub     │           │  Folders │
          │             │  (issues)    │           └──────────┘
          │             └──────────────┘
          │
          ├─ cross-posts to ──►┌──────────────────────────────┐
          │                    │   External Networks           │
          │                    │  Mastodon / Bluesky / LinkedIn│
          │                    └──────────────────────────────┘
          │                             ▲
          │                             │ OAuth tokens via
          │                    ┌────────┴──────────┐
          │                    │    Integrations    │
          │                    │  (Linked Identity) │
          │                    └───────────────────┘
          │
          ├─ filtered by ──►┌──────────────────┐
          │                 │  Follow Graph     │
          │                 │  (social layer)   │
          │                 └──────────────────┘
          │
          └─ triggers ──►┌──────────────────┐
                         │   Notifications   │
                         └──────────────────┘

     ┌──────────────────────────────────────────────┐
     │                Organizations                  │
     │  (groups users; owner of "The Public" = admin)│
     └──────────────────────────────────────────────┘

     ┌──────────────┐     ┌──────────────┐     ┌────────────────┐
     │    Exports   │     │   Analytics  │     │  Ambient UX    │
     │ (all data)   │     │  (all pages) │     │ Weather/Clock  │
     └──────────────┘     └──────────────┘     └────────────────┘
```

---

## Gap Fills

These are areas where the current feature set has seams that create friction — existing connections that are incomplete or poorly surfaced.

### 1. Lists ↔ Messages: attachment is one-directional and hidden
A message can reference a list, but there is no way to navigate from a list back to its associated message(s). The list detail page has no "related messages" section, and the message card does not visibly indicate a list is attached. Users discovering a list from a profile page have no path back to the conversation thread.

**Fix:** Bidirectional links. Show a "discussion" tab on list pages that surfaces messages that reference the list. Show a list preview card on any message that references one.

### 2. Documents ↔ Everything: Documents are an island
Documents exist in their own silo. You cannot reference a document from a message, link a document to a list, or embed a document section inside a list row. There is no search across documents. The folder UI is not surfaced on the home page or dashboard.

**Fix:** Allow messages to link to documents (producing a card preview). Allow list rows to store a document reference in a field type `document`. Add global search that spans messages, list data, and document content.

### 3. Notifications: covers only one trigger
Notifications fire only for message pushes. Follow requests, follow approvals, new replies to your messages, new list watchers, and new organization members produce no notifications. Users have to poll `/people` to see pending follow requests.

**Fix:** Emit notifications for: new reply to your message, follow request received, follow request approved, new list watcher added, mention in a message (if @-mentions are added), and new org member joined.

### 4. Organizations ↔ Lists/Documents: no shared ownership
An organization exists as a group of users, but there is no way to transfer ownership of a list or document to an organization. All lists and documents are owned by individual users. The watcher role on lists is the closest mechanism, but it is not tied to org membership — you have to add each member individually.

**Fix:** Allow creating a list or document under an organization, so all org members can access it according to their org role. Show org-owned lists on the organization profile page.

### 5. GitHub Integration ↔ UI: limited discoverability
GitHub-backed lists require the user to know the DSL and the refresh mechanism. There is no UI flow that says "import from GitHub" — it is entirely developer-facing. The "refresh list from GitHub" button exists but is not explained, and there is no indication of when the list was last synced or if the cron job ran successfully.

**Fix:** Add an "Import from GitHub Issues" wizard in the Lists UI. Show last-synced timestamp and sync status on GitHub-backed lists. Surface sync errors as notifications.

### 6. Scheduling ↔ Cross-posting: no preview or confirmation
When a user schedules a message with cross-post targets, there is no summary screen showing "this will post to Mastodon @instance and Bluesky at 3:00 PM on Friday." The `/dashboard/scheduled` page shows scheduled messages but not the configured cross-post targets.

**Fix:** Show cross-post targets inline in the scheduled message list. Add a confirmation modal before scheduling that summarizes exactly what will be posted where and when. Surface cron publish results as a notification when posts go live.

### 7. Cross-posting Errors: toasts only, no history
Cross-post errors are shown via a toast (`CrossPostErrorToast`). If the user is not on the page when the cron fires, they never see the error. There is no log of which scheduled messages failed to cross-post and why.

**Fix:** Persist cross-post result metadata per message (already partially done with `crossPostUrls`). Expose a "cross-post status" indicator on each message card and a full log on the scheduled messages page.

### 8. Search: absent
There is no search feature anywhere in the platform. With messages, lists, list rows, documents, and users all accumulating over time, the only navigation aid is the tag filter on the feed and the folder tree for documents.

**Fix:** Add a global search bar (Cmd+K) that searches across: messages (content), list data rows (rowData values), document content, usernames, and list/document titles.

### 9. Subscription wall UX: abrupt
When a free-tier user encounters a subscriber-only feature, the platform redirects them or shows an error. There is no contextual upgrade prompt that explains what they are missing and offers an inline path to subscribe.

**Fix:** Replace hard blocks with "upgrade" call-to-action modals or banners that describe the locked feature and link directly to the Stripe checkout for the relevant plan.

### 10. AI API Keys: stored but inert
The `/integrations` page lets users store OpenAI and Anthropic API keys, but nothing in the platform uses them. This is a dangling affordance that sets user expectations but delivers nothing.

**Fix:** Either wire these keys to at least one AI feature (see Lacking Features §1), or remove the key storage until a feature is ready to use them.

### 11. People page ↔ Discovery: no user discovery
The `/people` page manages follow requests, but there is no way to discover new users to follow. The platform has public profiles and a follow graph, but no directory, suggested users, or search by username.

**Fix:** Add a user directory or search-by-username feature. Consider a "who to follow" panel on the home page sidebar for logged-in users.

### 12. List watchers ↔ Collaboration: no notification or workflow
When a user is added as a list watcher, there is no notification, no email, and no way for the watcher to know a list was shared with them. Watchers have to navigate directly to a URL or be told out-of-band.

**Fix:** Notify users when they are added as a watcher on a list. Show a "lists shared with me" section in the `/lists` dashboard alongside owned lists.

---

## Lacking Features

These are features that the platform's mission — unified micro-blogging + structured data + social publishing — suggests should exist but currently do not.

### 1. AI-Assisted Content (Messages, Lists, Documents)
The platform already stores OpenAI and Anthropic API keys. The natural next step is to surface AI capabilities at the point of content creation:
- **Message drafting assistant**: suggest completions, rephrase, or summarize for each cross-post target's character limit
- **List data extraction**: paste unstructured text into a message and have AI extract structured rows into a linked list
- **Document summarization**: generate a short summary of a document to include as a message
- **Tag suggestion**: automatically suggest tags for a message based on its content

### 2. @Mentions and Notifications for Them
Messages currently support tags (hashtag-like), but there is no @username mention system. Mentioning a user by name in a message should notify them and create a social connection point. This is a foundational feature for any micro-blogging platform.

### 3. Direct Messaging (Private Conversations)
The platform has a full follow graph and user profiles but no private messaging. Users who want to interact privately must go to one of the connected platforms (Mastodon, Bluesky). A simple direct message inbox between followed users would keep conversational context inside the platform.

### 4. List Row Comments / Discussions
List rows are pure data. There is no way to discuss a specific row — e.g., debate the priority of a task, add context to a data point — without creating a separate message. A threaded comment system on list rows would bridge structured data and conversational micro-blogging at the row level, which is the core value proposition made explicit.

### 5. Message ↔ List Row Promotion
A common workflow: you post a message about an idea or a task, and later want to capture it as a structured list item. There should be a one-click "add to list" action on any message that pre-populates a new list row from the message's content, with AI assistance if an API key is configured.

### 6. Recurring / Template Messages
For users who post regular updates (daily standups, weekly reviews, status reports), a message template with variable substitution and a recurrence schedule would reduce friction. This builds on the existing scheduling infrastructure.

### 7. Embedded List Views in Documents
Documents are currently standalone Markdown blobs. A `[[list:id]]` embed syntax that renders a live, read-only view of a list (or filtered subset of a list) inside a document would make documents significantly more useful as reports, project pages, or status dashboards.

### 8. List Formulas and Computed Columns
The list schema supports types but not formulas. A `computed` field type that derives its value from other fields (e.g., `=if(Status == "Closed", 1, 0)` for a completion score, or `=count(children)`) would make lists useful for light project management and tracking without needing a full spreadsheet.

### 9. Webhooks for List Changes (Outbound)
The platform receives webhooks (Stripe, Resend, GitHub via cron), but does not send them. Power users want to trigger external workflows when list data changes — e.g., push a row change to a Slack channel, trigger a GitHub Actions run, or update an external database. An outbound webhook system per list would make the platform a source of truth that other tools can react to.

### 10. Mobile App or PWA
The platform is a web app with no mobile-native experience. Given that micro-blogging is inherently mobile-first behavior, a Progressive Web App (PWA) manifest, push notification support (via Web Push), and a mobile-optimized compose interface would significantly improve daily usage patterns.

### 11. Content Federation (ActivityPub)
The platform integrates with Mastodon (ActivityPub) for cross-posting, but does not implement ActivityPub itself. A user on InterlinedList cannot be followed from a Mastodon instance directly. Implementing ActivityPub would make InterlinedList a first-class citizen of the fediverse — users could follow InterlinedList accounts from any compatible platform, and their messages would federate without needing to cross-post manually.

### 12. List Import from External Sources
GitHub issues is the only external data source for lists. Natural extensions:
- **CSV import**: upload a CSV file and map columns to list properties
- **Notion import**: pull a Notion database via API
- **Google Sheets import**: sync a sheet as a list
- **RSS/Atom**: periodically ingest feed entries as list rows (great for tracking news, release notes, etc.)

### 13. Version History for Lists and Documents
Lists and documents have no version history. Accidental overwrites or deletes (even with soft-delete on lists) have no recovery path beyond a database restore. A lightweight version trail — storing the previous N snapshots of a document's content or a list row's data — would give users confidence to edit freely.

### 14. Analytics for Individual Users (Not Just Admins)
The analytics system feeds into an admin dashboard. Individual users have no visibility into their own content performance: which messages got the most digs, which cross-posts got the most engagement on which platform, how their follower count has grown over time. Personal analytics would make the platform more motivating and help users understand what content resonates.

### 15. Organization-Level Shared Inbox / Feed
Organizations exist but have no shared content space. An organization feed — where all member messages tagged with the org are visible to members — would make organizations useful for teams, companies, or communities rather than being purely an access-control mechanism.
