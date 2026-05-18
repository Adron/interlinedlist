# Mobile Client Setup Guide

This guide covers what a native iOS (or Android) client needs to authenticate and use the InterlinedList API, receive push notifications, and connect social accounts via OAuth.

---

## 1. Bearer Token Authentication

All API endpoints support `Authorization: Bearer <token>` in addition to browser session cookies. This is the authentication method native clients should use.

### Obtaining a token

**Email/password login:**
```http
POST /api/auth/sync-token
Content-Type: application/json

{ "email": "user@example.com", "password": "..." }
```

Response:
```json
{ "token": "abc123...", "message": "Sync token created. Store it in your CLI config." }
```

**After OAuth (Mastodon, Bluesky, LinkedIn):** the callback redirects to your registered custom URL scheme with the token in the query string (see [Section 4](#4-mobile-oauth-social-login)).

Store the token securely (iOS Keychain, Android Keystore). Include it on every request:

```http
Authorization: Bearer abc123...
```

---

## 2. Apple Push Notifications (APNs)

### Server environment variables

| Variable | Where to find it |
|----------|-----------------|
| `APNS_KEY_ID` | Apple Developer Console → Certificates, Identifiers & Profiles → Keys → create/view a key with APNs enabled. The Key ID is the 10-character string shown on the key detail page (e.g. `ABC123DEF4`). |
| `APNS_TEAM_ID` | Apple Developer Console → Account → Membership → Team ID (e.g. `ABCD1234EF`). Also shown in the top-right corner of most console pages. |
| `APNS_BUNDLE_ID` | The bundle identifier of your iOS app, set in Xcode → Signing & Capabilities (e.g. `com.interlinedlist.app`). Must match the App ID registered in Apple Developer Console → Identifiers. |
| `APNS_PRIVATE_KEY` | The `.p8` file downloaded when you created the APNs key. Apple offers this download once. The file contains a PEM block starting with `-----BEGIN PRIVATE KEY-----`. Paste the entire multi-line contents as the env var value. On Vercel, paste it directly into the dashboard — newlines are preserved. On other hosts, replace newlines with `\n`. |
| `APNS_PRODUCTION` | `false` for sandbox (development builds, TestFlight); `true` for production (App Store distribution). |

### Creating the APNs key

1. Sign in to [developer.apple.com](https://developer.apple.com/account).
2. Go to **Certificates, Identifiers & Profiles → Keys**.
3. Click **+** to create a new key.
4. Give it a name (e.g. `InterlinedList APNs`), check **Apple Push Notifications service (APNs)**.
5. Click **Continue → Register**.
6. **Download the `.p8` file immediately** — it cannot be downloaded again.
7. Note the **Key ID** displayed on the confirmation page.

### Registering a device token (iOS client)

After obtaining an APNs device token (via `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`):

```http
POST /api/push/register
Authorization: Bearer <token>
Content-Type: application/json

{ "token": "<hex-encoded-apns-device-token>", "platform": "ios" }
```

Response: `{ "ok": true }`

On logout, unregister the token so the user stops receiving notifications:

```http
DELETE /api/push/unregister
Authorization: Bearer <token>
Content-Type: application/json

{ "token": "<hex-encoded-apns-device-token>" }
```

### When push notifications are sent

The server sends a push notification (fire-and-forget, never blocks the originating request) in two situations:

| Trigger | Title | Body |
|---------|-------|------|
| Any new in-app notification created (follow events, engagement, etc.) | Matches `UserNotification.title` | Matches `UserNotification.body` |
| A user follows you (private account — request pending) | `New follow request` | `<name> has requested to follow you` |
| A user follows you (public account — auto-approved) | `New follower` | `<name> is now following you` |

Stale device tokens (APNs returns HTTP 410) are automatically removed from the database.

---

## 3. Notifications API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications?scope=tray` | GET | Unread notifications (up to `notificationTrayLimit`, default 20) plus total `unreadCount` |
| `/api/notifications/mark-all-read` | POST | Mark all unread notifications as read |
| `/api/notifications/[id]/read` | PATCH | Mark a single notification read (idempotent) |
| `/api/notifications/[id]` | DELETE | Delete a single notification (returns 204) |

All endpoints require `Authorization: Bearer <token>`.

---

## 4. Mobile OAuth (Social Login)

iOS clients should use `ASWebAuthenticationSession` to open the OAuth authorize URL. The server redirects back to a custom URL scheme after authentication and returns a Bearer token in the query string — no session cookie is involved.

### Registering your custom URL scheme in Xcode

1. Open your project in Xcode.
2. Select the app target → **Info → URL Types**.
3. Click **+** and set **URL Schemes** to `interlinedlist` (no `://`).
4. This makes `interlinedlist://...` URLs open your app.

### Setting the server allowlist

Add both the web callback and your custom scheme to `OAUTH_ALLOWED_REDIRECT_URIS` (comma-separated, no spaces):

```
OAUTH_ALLOWED_REDIRECT_URIS=https://interlinedlist.com/oauth/callback,interlinedlist://oauth/callback
```

Any URI not in this list is rejected with an error redirect.

### OAuth flow for each provider

#### Mastodon

```
GET /api/auth/mastodon/authorize
  ?instance=mastodon.social          (required — the user's Mastodon instance domain)
  &redirect_uri=interlinedlist://oauth/callback
  &link=false                        (true = link to existing account; false = sign in)
```

The authorize endpoint:
1. Registers the app with the Mastodon instance (or reuses cached credentials).
2. Stores the `redirect_uri` in a short-lived state cookie.
3. Redirects to the Mastodon instance's OAuth screen.

After the user authorizes, Mastodon redirects to `/api/auth/mastodon/callback`. The server detects the custom scheme `redirect_uri`, creates a Bearer token, and redirects to:

```
interlinedlist://oauth/callback?token=<bearer-token>
```

#### Bluesky

```
GET /api/auth/bluesky/authorize
  ?handle=alice.bsky.social          (optional — user's Bluesky handle or leave blank for bsky.social)
  &redirect_uri=interlinedlist://oauth/callback
  &link=false
```

Bluesky uses the AT Protocol OAuth client (`@atproto/oauth-client-node`), which handles PKCE and DPoP internally. After authorization, the callback issues a Bearer token and redirects to your custom scheme the same way as Mastodon.

#### LinkedIn

```
GET /api/auth/linkedin/authorize
  ?redirect_uri=interlinedlist://oauth/callback
  &link=false
```

Same flow — LinkedIn redirects back to `/api/auth/linkedin/callback`, which issues a Bearer token and redirects to your custom scheme.

### Handling the callback in Swift

```swift
let session = ASWebAuthenticationSession(
    url: URL(string: "https://interlinedlist.com/api/auth/mastodon/authorize?instance=mastodon.social&redirect_uri=interlinedlist://oauth/callback")!,
    callbackURLScheme: "interlinedlist"
) { callbackURL, error in
    guard let url = callbackURL,
          let token = URLComponents(url: url, resolvingAgainstBaseURL: false)?
              .queryItems?.first(where: { $0.name == "token" })?.value
    else { return }

    // Store token in Keychain, use for all subsequent API calls
    KeychainHelper.save(token: token)
}
session.presentationContextProvider = self
session.start()
```

---

## 5. Follow / Unfollow API

All endpoints require `Authorization: Bearer <token>`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/follow/[userId]` | POST | Follow a user. Returns 201 with `{ follow: { id, followerId, followingId, status, createdAt, updatedAt } }`. `status` is `"approved"` for public accounts, `"pending"` for private. |
| `/api/follow/[userId]` | DELETE | Unfollow a user |
| `/api/follow/[userId]/status` | GET | Returns `{ status, isFollowing, isPending }` |
| `/api/follow/[userId]/followers` | GET | Paginated follower list (`?limit=50&offset=0&status=approved\|pending`) |
| `/api/follow/[userId]/following` | GET | Paginated following list (same params) |
| `/api/follow/[userId]/counts` | GET | Returns `{ followers, following, pendingRequests }` |
| `/api/follow/[userId]/mutual` | GET | Returns `{ mutualFollowers, mutualFollowing }` |
| `/api/follow/requests` | GET | Pending follow requests directed at the authenticated user |
| `/api/follow/[userId]/approve` | POST | Approve a pending follow request from `userId` |
| `/api/follow/[userId]/reject` | POST | Reject a pending follow request from `userId` |
| `/api/follow/[userId]/remove` | DELETE | Remove `userId` from your followers |

---

## 6. Profile Editing API

All endpoints require `Authorization: Bearer <token>`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user` | GET | Current user profile |
| `/api/user/update` | PATCH | Update profile fields (see below) |
| `/api/user/avatar/upload` | POST | Upload avatar image (`multipart/form-data`, field name `file`, JPEG/PNG, max 1.4 MB) |
| `/api/user/avatar/from-url` | POST | Set avatar from a URL: `{ "url": "https://..." }` |
| `/api/user/change-email/request` | POST | Request an email address change: `{ "newEmail": "..." }` — sends verification to the new address |

**PATCH `/api/user/update` accepted fields:**

```json
{
  "displayName": "Alice",
  "bio": "Hello world",
  "avatar": "https://...",
  "theme": "dark",
  "isPrivateAccount": true,
  "maxMessageLength": 500,
  "defaultPubliclyVisible": false,
  "messagesPerPage": 20,
  "viewingPreference": "all_messages",
  "showPreviews": true,
  "showAdvancedPostSettings": false,
  "latitude": 47.6062,
  "longitude": -122.3321,
  "notificationTrayLimit": 30
}
```

---

## 7. Documents API

All endpoints require `Authorization: Bearer <token>` and an active subscription.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents` | GET | Root-level documents (no folder) |
| `/api/documents` | POST | Create a root-level document: `{ title, content, isPublic }` |
| `/api/documents/[id]` | GET | Get document by ID (public documents accessible without auth) |
| `/api/documents/[id]` | PUT | Update: `{ title?, content?, isPublic? }` |
| `/api/documents/[id]` | DELETE | Soft-delete document and remove associated blob images |
| `/api/documents/[id]/images/upload` | POST | Upload an inline image (`multipart/form-data`, field `file`) |
| `/api/documents/folders` | GET | Root folders |
| `/api/documents/folders` | POST | Create folder: `{ name, parentId? }` |
| `/api/documents/folders/[id]` | GET | Folder with children and documents |
| `/api/documents/folders/[id]` | PUT | Rename/move folder: `{ name?, parentId? }` |
| `/api/documents/folders/[id]` | DELETE | Soft-delete folder (cascades to children and documents) |
| `/api/documents/folders/[id]/documents` | GET | Documents in a folder |
| `/api/documents/folders/[id]/documents` | POST | Create document in folder |
| `/api/documents/sync` | POST | Sync documents from external source (conflict detection via content hash) |
| `/api/documents/templates` | GET | List template documents |
| `/api/documents/from-template` | POST | Create document from a template |

Document `content` is plain Markdown. The server stores and returns it as-is — rendering is the client's responsibility.

---

## 8. Media Upload API

All upload endpoints require `Authorization: Bearer <token>`, a verified email address, and an active subscription.

| Endpoint | Method | Max size | Accepted types |
|----------|--------|----------|---------------|
| `/api/messages/images/upload` | POST | 1.4 MB | JPEG, PNG |
| `/api/messages/videos/upload` | POST | 3 MB | MP4, WebM, MOV, AVI |
| `/api/documents/[id]/images/upload` | POST | 1.4 MB (SVG: 500 KB) | PNG, JPG, GIF, WebP, SVG |

All accept `multipart/form-data` with the file in a field named `file`. Images are auto-resized server-side (max 1200×1200 px) using `sharp`. Responses include a `url` pointing to Vercel Blob CDN.
