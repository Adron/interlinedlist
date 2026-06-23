---
title: Following
---

# Following

Follow and unfollow users, manage follow requests for private accounts, and query the social graph.

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/follow/:userId` | Session or Bearer | Follow a user. For private accounts this creates a pending follow request. |
| DELETE | `/api/follow/:userId` | Session or Bearer | Unfollow a user. |
| GET | `/api/follow/:userId/status` | Session or Bearer | Current follow relationship between you and this user. |
| GET | `/api/follow/:userId/followers` | Session or Bearer | Followers of this user. Supports `limit`, `offset`. |
| GET | `/api/follow/:userId/following` | Session or Bearer | Users this user follows. Supports `limit`, `offset`. |
| GET | `/api/follow/:userId/counts` | Session or Bearer | Follower and following counts. |
| GET | `/api/follow/:userId/mutual` | Session or Bearer | Mutual follows between you and this user. |
| POST | `/api/follow/:userId/approve` | Session or Bearer | Approve an incoming follow request (private accounts). |
| POST | `/api/follow/:userId/reject` | Session or Bearer | Reject an incoming follow request. |
| DELETE | `/api/follow/:userId/remove` | Session or Bearer | Remove this user from your followers. |
| GET | `/api/follow/requests` | Session or Bearer | Your pending incoming follow requests. |

## Follow status

```http
GET /api/follow/clx9user00002/status
```

```json
{ "following": true, "followedBy": false, "pendingRequest": false }
```

For a private account where the follow request is pending:

```json
{ "following": false, "followedBy": false, "pendingRequest": true }
```

## Approving a request

```http
POST /api/follow/clx9user00099/approve
```

The request is removed and the follow relationship is established. The follower is notified.

## Counts and lists

```http
GET /api/follow/clx9user00002/counts
```

```json
{ "followers": 128, "following": 84 }
```

```http
GET /api/follow/clx9user00002/followers?limit=50&offset=0
```

Returns a paginated list of user objects.

## Notes

- These endpoints check the privacy setting of the target user. A private account never reveals follower/following lists to non-followers.
- Removing a follower (`DELETE /api/follow/:userId/remove`) does **not** block them; it only severs the existing relationship. They can re-follow (or request to follow again for private accounts).
