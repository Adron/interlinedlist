# InterlinedList — Social Network & Connection Features Priority

This document focuses on the follow/unfollow, sharing, tagging, and connection-network layer of InterlinedList. The goal is a coherent system for managing one's social graph — personal friends, work contacts, professional communities — with enough structure to make the graph actually useful rather than just a flat list of names.

---

## Design Principle

The core tension in social graph features is **simplicity vs. expressiveness**. A flat follow list is simple to understand but useless for anyone with more than 50 connections. Overly complex permission hierarchies (Google+ Circles, Facebook lists) are expressive but create cognitive overhead that users avoid. The right balance for InterlinedList is **lightweight, private labeling** that the user controls entirely, combined with **purposeful sharing surfaces** that make the labels actionable.

Tags on connections should be:
- **Private by default** — no one else sees how you label them
- **Freeform but guided** — user-defined text with smart suggestions
- **Actionable** — used to filter feeds, scope posts, and batch-share content

---

## Priority Tiers

### Tier 1 — Foundation (implement first; everything else depends on these)

---

#### 1.1 Connection Tags (Labels on Follows)

**What it is:** A user can attach one or more private text tags to any person they follow. Tags are fully user-defined (e.g., `work`, `friend`, `tech`, `local`, `podcast`, `client`). They are stored per-follow-relationship, never exposed to the tagged person or anyone else.

**Why it matters:** This is the minimum viable way to turn a flat follow list into a structured network. Without it, a user with 200 follows has no way to contextualize who any of them are.

**Capabilities:**
- Tag any followed user with 1–10 short labels (max 30 chars each)
- Edit or remove tags at any time from the People page or a user's profile
- Autocomplete from your own previously used tags while typing
- Tag count is private; no public "tagged by N users" mechanic
- Tags survive an unfollow-then-refollow cycle (preserved on the relationship row)

**Data model:**
- `FollowTag` table: `followId`, `tag` (string), `createdAt`
- Index on `followId` for fast fetch; index on `(userId, tag)` for filter queries
- Or as a `tags: String[]` column on the `Follow` row if using a JSON/array column

**UI touchpoints:**
- People page → following tab: tag chip(s) next to each person with an edit icon
- User profile page: private tag editor in a "My connection notes" sidebar section (only visible to the viewer)
- Tag inline in follow confirmation flow ("You're now following X. Add a tag?")

---

#### 1.2 Connection Groups (Named Circles)

**What it is:** A user can create named groups (e.g., "Work Team", "Book Club", "SF Tech Scene") and add followed users to them. Groups are similar to tags but have an explicit list identity, a description, and optional settings (see Tier 2 for group-based posting).

**Why it matters:** Tags are per-connection labels; groups are first-class objects. Groups unlock the feed filter, group-scoped sharing, and group discovery without exposing the tag free-form system's complexity.

**Capabilities:**
- Create, rename, and delete groups
- Add/remove members (must already follow them)
- A person can belong to multiple groups
- Groups have a privacy setting: **private** (default, invisible to anyone) or **public** (visible on your profile as a "list of people I curate" — opt-in)
- Optional group description (Markdown, shown only for public groups)
- Maximum of 50 groups per user; maximum of 500 members per group

**Data model:**
- `ConnectionGroup` table: `id`, `ownerId`, `name`, `description`, `isPublic`, `createdAt`
- `ConnectionGroupMember` table: `groupId`, `followedUserId`, `addedAt`

**UI touchpoints:**
- `/people` page: left sidebar lists your groups; clicking one filters the following tab
- Group management page at `/people/groups`
- "Add to group" action on any followed user's row or profile

---

#### 1.3 Tag & Group Feed Filters

**What it is:** The home feed and the `/people` following tab can be filtered by a connection tag or group, showing only messages from people in that segment.

**Why it matters:** The feed is where tags and groups become useful. Without a feed filter, they are bookkeeping with no payoff.

**Capabilities:**
- Filter the home feed by one tag (shows posts from all followed users who carry that tag)
- Filter the home feed by one group (shows posts from all members of that group)
- Filter is additive with existing public/followed/both toggle — they compose
- Selected filter persists in the URL (`?filter=tag:work` or `?filter=group:abc123`) so it is shareable and bookmarkable
- Feed filter selector in the left sidebar alongside the existing visibility toggle

---

#### 1.4 Follow Request UX Overhaul

**What it is:** The current follow request flow on `/people` is minimal. This replaces it with a proper request management interface and adds a tag-at-approval step.

**Why it matters:** Private accounts are common; the approval flow is the entry point to the connection graph. A clumsy flow creates friction that discourages using private accounts.

**Capabilities:**
- Incoming follow requests: avatar + display name + bio snippet + "Approve" / "Decline" / "Block" actions
- When approving, offer an inline "Add a tag?" prompt (dismissible)
- Outgoing follow requests: list of pending requests you have sent, with a "Cancel" action per request
- Notification badge on the `/people` page nav link when requests are pending
- Email notification for new follow request (opt-in in settings)
- Batch approve or batch decline (checkbox multi-select)

---

#### 1.5 Mute (Soft Unfollow)

**What it is:** A user can mute a followed account. The muted account still sees them as a follower, and the muted account can still see their public content, but the muted account's posts no longer appear in the muter's feed.

**Why it matters:** Social platforms have three states: follow, block, unfollow. Mute fills the gap between "I want to stay connected but don't want the noise right now." Without it, unfollowing is the only noise reduction tool — which breaks the relationship entirely.

**Capabilities:**
- Mute/unmute from a user's profile or from the People page
- Muted accounts do not appear in the home feed
- Muted accounts can still comment on and reply to your posts (unless blocked)
- A "muted" tab on the People page lists currently muted accounts
- Muting does not send any notification to the muted user
- Mute is independent of tags and groups (a muted person can still belong to a group)

---

### Tier 2 — Network Depth (add after Tier 1 is stable)

---

#### 2.1 Group-Scoped Post Visibility

**What it is:** When composing a message, the user can set visibility to "Group: [group name]" in addition to the existing Public/Private options. Only members of that group who follow the poster will see the message in their feed. It does not appear on the public profile.

**Why it matters:** This is the primary payoff of Connection Groups. Without it, groups are organizational metadata with no behavioral effect on content. Group-scoped posts are the InterlinedList equivalent of a Facebook audience selector or a Mastodon custom list — but intentionally simpler.

**Capabilities:**
- Visibility selector in the compose box: Public / Followers Only / Group / Private
- Selecting "Group" opens a dropdown of the user's groups
- A post can target only one group
- The group restriction is enforced server-side on the feed API
- Group-scoped messages are not cross-posted to external networks (they are inherently private)
- The message card shows a lock icon + group name only to the author (others just see the post, not its audience label)

---

#### 2.2 Share to Specific Users (Direct Share)

**What it is:** A "Share with…" action on any message, list, or document that lets you send it directly to one or more followed users as a notification, without creating a public repost.

**Why it matters:** Currently "Push" (repost) is the only share mechanism and it is public. There is no way to say "I think you'd like this" to a specific person without @mentioning them publicly or going off-platform.

**Capabilities:**
- "Share with…" button on message cards, list detail pages, and document pages
- Opens a modal with a people-picker (search by name, filtered to people you follow)
- Up to 10 recipients per share action
- The recipient gets an in-app notification: "X shared a [message/list/document] with you"
- The shared item appears in a "Shared with me" inbox at `/people/shared`
- No public signal is created — the share is invisible to everyone else
- Rate limit: max 20 direct shares per hour to prevent spam

---

#### 2.3 Block

**What it is:** A user can block another user. Blocking is mutual and symmetric in its effects.

**Why it matters:** Mute is soft. Block is hard. Both are necessary. Without block, there is no defense against harassment or unwanted interaction.

**Capabilities:**
- Block from a user's profile, from message cards (via "…" menu), or from the People page
- Effect: the blocked user cannot view your profile (receives a 404), cannot see your messages, cannot follow you, cannot reply to you, and is removed from your followers if they were following you
- You cannot see the blocked user's profile or messages in your feed (they are hidden)
- Blocking is not announced to the blocked user
- "Blocked users" tab on the People page with an unblock action
- A blocked user attempting to follow triggers a silent rejection (no error displayed to them)

---

#### 2.4 User Profile Notes (Private Connection Notes)

**What it is:** A private free-text note field on each follow relationship. Unlike tags (which are short labels), notes are longer-form: "Met at PyCon 2024. Works on the infra team at Acme. Interested in distributed systems."

**Why it matters:** Contact management tools (CRMs, address books) have always had a notes field. For a work network, being able to remember context about a connection is high-value and currently absent from all social platforms.

**Capabilities:**
- Freeform text up to 500 characters per connection
- Visible only to the note author
- Editable from the People page or a user's profile
- Searchable within the People page (local search across your own notes)
- Notes survive the unfollow-then-refollow cycle alongside tags

**Data model:**
- `note: String?` column on the `Follow` table (or alongside FollowTag data)

---

#### 2.5 Mutual Connections Display

**What it is:** On a user's profile, show how many of your follows also follow this person (mutual connections), and optionally list a few of them by avatar.

**Why it matters:** Mutual connections are the core trust signal in any professional network. "3 people you follow also follow this person" is meaningful social proof that drives follow decisions.

**Capabilities:**
- On a user's profile (viewed while logged in): "X mutual follows" with up to 5 avatars shown
- Clicking the count opens a modal listing the mutual follows
- If you have no mutuals, show nothing (do not show "0 mutual follows")
- Computed at request time for the profile page; no denormalization needed at this scale

---

#### 2.6 Enhanced People Discovery

**What it is:** A user directory and "suggested follows" system on the `/people` page.

**Why it matters:** The current People page only manages existing relationships. There is no way to find new people to follow. This is one of the most significant gaps in the social layer (noted in FEATURES.md Gap #11).

**Capabilities:**
- **Search by username or display name**: a search bar at the top of the People page that queries all public accounts
- **Suggested follows panel**: on the home page right sidebar and on `/people`, show up to 5 suggested users based on:
  1. Followed-by-people-you-follow (2nd-degree connections), ranked by overlap count
  2. Users with public content in the same tag space you post in (tag affinity)
  3. Recent joiners with public accounts (fallback)
- **"People with this tag" browse**: from any tag on a message or profile, link to a discovery page showing public accounts that use that tag in their bio or posts
- **Dismiss suggestion**: "Not interested" action per suggested user (hides them from suggestions permanently)

---

### Tier 3 — Power User & Network Intelligence (after Tier 2)

---

#### 3.1 Follow Notification Preferences Per Connection

**What it is:** For each followed user, the follower can set a notification preference: **All posts** (notify me for every message), **Highlights only** (notify me when they post, not for replies), or **Quiet** (no notifications, just feed).

**Why it matters:** A flat follow list treats all followed accounts equally. For people you care about most, you want to know when they post. For accounts you follow loosely, you want them in the feed but no noise. This is the "bell icon" mechanic present on YouTube, Twitter, and Instagram.

**Capabilities:**
- Notification preference selector on each person's row in the People → following tab, and on their profile page
- Default: Quiet (current behavior, no regression)
- "Highlights only" = notify on original posts, not replies
- "All posts" = notify on every message the person creates (not reposts of others)
- Notification appears in the in-app notification tray with the message preview
- Weekly digest email option: "Here are posts from your highlighted connections this week"

---

#### 3.2 Import Connections (CSV / Contact List)

**What it is:** A user can import a list of usernames or email addresses to quickly find and follow people they already know.

**Why it matters:** Cold-start problem: a new user who knows no one on the platform has no social graph. Import lowers the activation barrier dramatically.

**Capabilities:**
- Upload a CSV with a `username` or `email` column
- Match against existing InterlinedList accounts by username or registered email
- Show a preview: "We found 14 of your contacts on InterlinedList" with a list of matches
- Bulk follow all or select individually
- Email addresses are never stored beyond the import session; they are hashed, matched, and discarded
- Import from Twitter/X archive (extract follows from the `following.js` file) — just username matching
- Import from Mastodon export (CSV of follows)

---

#### 3.3 Network Visualization

**What it is:** A graph view at `/people/graph` that renders the user's follow network as an interactive node-link diagram, using the same ReactFlow infrastructure that already exists for list ERD diagrams.

**Why it matters:** For power users and for people who think visually, seeing the shape of their network — clusters of work contacts, separate cluster of hobbyist friends, bridge nodes who connect clusters — is genuinely informative and satisfying.

**Capabilities:**
- Nodes: each person you follow or who follows you
- Edges: follow relationship (directed; arrow from follower to followed)
- Color coding by connection tag (configurable)
- Node size scaled by mutual follow count (more mutuals = larger node)
- Click a node to open the person's profile in a side panel
- Filter by tag or group (hides non-matching nodes)
- Export as PNG
- Performance: cap at 500 nodes; prompt to filter if the user's graph is larger

---

#### 3.4 Public Connection Lists (Curated Follow Lists)

**What it is:** A user can make one of their Connection Groups public, turning it into a shareable curated list of accounts — similar to Twitter/X Lists.

**Why it matters:** Curated lists are a discovery mechanism for readers ("follow this list of ML researchers") and a reputation signal for curators ("this person maintains a high-quality list of climate scientists"). They compose naturally with the existing Groups feature.

**Capabilities:**
- Toggle any group from private to public; once public, it gets a slug-based URL (`/@username/lists/group-slug`)
- Public group page: description, member count, list of members with their avatars and bio snippets
- "Follow this list" action: adds all current and future members of the list to a user's feed (not as explicit follows — as a virtual subscription to the list's feed)
- List feed: a dedicated feed page that shows only posts from members of a followed list
- Creator can add/remove members; followers see updates within 24 hours (cached)
- Public lists appear on the user's profile under a "Curated lists" section

---

#### 3.5 Connection Strength Signals

**What it is:** A private "connection strength" score per follow relationship, computed from interaction history (replies, digs, direct shares, list collaborations). Shown only to the logged-in user.

**Why it matters:** Not all follows are equal. The people you interact with most are your actual inner circle; the rest are ambient. Surfacing this helps users identify who their true network is and who they might want to reconnect with.

**Capabilities:**
- Score components (all private, computed weekly):
  - Replied to their post in the last 30 days: +3 per reply
  - Dug their post in the last 30 days: +1 per dig
  - They dug or replied to your post: +2 per interaction
  - Direct share sent or received: +5 per share
  - List collaboration (shared watcher): +10 flat
- Score decays: interactions older than 90 days count at half weight
- Display: a faint warmth indicator (3-dot scale: dim / medium / bright) on each person's row in the People page
- No explicit number is shown — the signal is qualitative
- Used internally to rank "Suggested follows" and sort the People page (most active connections first, opt-in sort)

---

#### 3.6 Follow/Unfollow Activity Log (Personal)

**What it is:** A private log for the user showing their own follow/unfollow history — who they followed, when, and who unfollowed them.

**Why it matters:** Users want to know when people unfollow them (without being weird about it). They also want to audit their own "following" growth over time. No other user can see this log.

**Capabilities:**
- Accessible at `/people/activity`
- Events: "You followed X", "X followed you", "You unfollowed X", "X unfollowed you", "You blocked X", "Follow request from X approved/declined"
- Paginated, 30 days of history retained
- "X unfollowed you" is shown with a 48-hour delay to reduce anxiety-driven behavior
- Export as CSV from the existing Data Exports feature

---

### Tier 4 — Long-Horizon / Strategic

---

#### 4.1 Verified Identity Badges

**What it is:** A lightweight self-verification system where users can link their InterlinedList profile to a domain they own or an external identity (Keybase-style), earning a checkmark that says "this account is controlled by the owner of `example.com`."

**Why it matters:** As the platform grows, impersonation becomes a real problem. Domain verification is cryptographically provable without requiring a centralized authority to issue badges.

**Mechanism:**
- User adds a `<meta>` tag or a `/.well-known/interlinedlist.txt` file to their domain
- InterlinedList crawls and verifies the presence of their user ID in that file
- On success, the profile shows a "Verified: example.com" badge
- Domain verification does not carry the "trust" baggage of paid blue-checks

---

#### 4.2 Relationship Context on Cross-Posts

**What it is:** When a cross-posted message gets a reply on Mastodon or Bluesky from someone you follow on InterlinedList, the reply is surfaced back into the InterlinedList notification system with a "from [external platform]" label.

**Why it matters:** Cross-posting currently goes one way. Conversation happening on Mastodon in response to your post is invisible on InterlinedList. Closing this loop makes the platform the hub rather than just a publisher.

**Mechanism:**
- Requires periodic polling of the cross-post's external URL for replies (Mastodon and Bluesky APIs support this)
- Match the replying account to known linked identities in the platform's OAuth store
- If matched, create a notification: "Y replied to your Mastodon post"
- If not matched, surface as an anonymous "external reply" count on the message card

---

#### 4.3 Contact Relationship Types (Professional vs. Personal)

**What it is:** Beyond tags and groups, allow a user to classify the nature of each connection with a structured relationship type: **Professional** / **Personal** / **Following** (no mutual expectation). This is metadata only, used for privacy defaults.

**Why it matters:** Most social platforms collapse all relationships into one model. The distinction between "this is a colleague I work with" and "this is a Twitter account I find interesting" is meaningful for privacy defaults and for how content should be shared with them.

**Capabilities:**
- Set relationship type when approving a follow or from the People page
- Default: **Following**
- Relationship type determines the default audience when composing a group-scoped post ("suggest Professional group?")
- Feeds into the "Connection strength" algorithm (Professional contacts get boosted weight)
- Entirely private

---

## Feature Interaction Map

```
Connection Tags ──────────────────────────────────────────────────────────┐
    │                                                                      │
    ├──► Tag Feed Filter ──► filtered home feed                            │
    │                                                                      │
    ├──► People Page filter ──► filtered following list                    │
    │                                                                      │
    └──► Connection Strength ──► People page sort / Suggested follows      │
                                                                           │
Connection Groups ─────────────────────────────────────────────────────── ┤
    │                                                                      │
    ├──► Group Feed Filter ──► filtered home feed                          │
    │                                                                      │
    ├──► Group-Scoped Post Visibility ──► private audience for messages    │
    │                                                                      │
    └──(opt-in)──► Public Connection List ──► shareable discovery page     │
                                                                           │
Follow/Unfollow ──────────────────────────────────────────────────────────┘
    │
    ├──► Follow Request UX ──► tag at approval ──► Connection Tags
    │
    ├──► Mute ──► feed suppression without relationship break
    │
    ├──► Block ──► full relationship termination
    │
    ├──► Follow Notification Prefs ──► in-app notifications / digest email
    │
    └──► Activity Log ──► personal audit trail

Share with... ──► Direct Share notification ──► Shared with me inbox

Mutual Connections ──► trust signal on profile pages

Network Visualization ──► node-link graph of the full follow graph
```

---

## Implementation Notes

### Tagging implementation order

1. Add `FollowTag` model to Prisma schema (additive migration)
2. API routes: `POST /api/people/[userId]/tags`, `DELETE /api/people/[userId]/tags/[tag]`, `GET /api/people/[userId]/tags`
3. People page UI: tag chips + edit inline
4. Feed filter: `?filter=tag:<tag>` query param wired to the feed API
5. Autocomplete: `GET /api/people/tags/mine` returns distinct tags used by the current user

### Groups implementation order

1. Add `ConnectionGroup` + `ConnectionGroupMember` to Prisma schema
2. CRUD API for groups
3. Groups sidebar on People page
4. Feed filter for groups
5. Group-scoped post visibility (compose + feed API enforcement)
6. Public group toggle + public group page

### Privacy invariants to enforce server-side

- Tags are never returned in any API response except to the tag's owner
- Group membership is never returned in any API response except to the group's owner (unless the group is public)
- Connection notes are never returned except to the note's author
- Connection strength scores are never returned except to the computing user
- Block list is never returned to the blocked user
- "X unfollowed you" events are delayed 48 hours before appearing in the activity log

### Mute vs. Block — server-side enforcement

| Action | Can view your profile | Can follow you | Sees your posts | You see their posts |
|--------|----------------------|----------------|-----------------|---------------------|
| Mute | Yes | Yes (if public) | Yes | No |
| Block | No (404) | No (silently rejected) | No | No |
| Restrict (future) | Yes | Yes | Limited | No |

---

## Success Metrics

- **Tag adoption rate**: % of users with ≥1 follow who have tagged at least one connection (target: 40% within 90 days of launch)
- **Group creation rate**: % of active users who have created at least one group (target: 25%)
- **Feed filter engagement**: % of feed sessions that use a tag or group filter (target: 20%)
- **Mute-to-unfollow ratio**: as mute adoption grows, raw unfollow rate should decrease, signaling that mute is absorbing relationship friction
- **Direct share volume**: number of "Share with…" actions per week as a proxy for private network engagement
- **Discovery funnel**: % of new users who follow at least 5 people within 7 days of signup (target: 50%, up from unknown baseline)
