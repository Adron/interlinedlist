# Follow API

## POST /api/follow/[userId]

Follow a user. `[userId]` = user to follow.

**Response:** `{ follow: { id, followerId, followingId, status, createdAt, updatedAt } }`

- 400: Cannot follow yourself
- 404: User not found

## DELETE /api/follow/[userId]

Unfollow a user. `[userId]` = user to unfollow.

## GET /api/follow/[userId]/status

Check follow status between current user and `[userId]`.

**Response:** `{ following: boolean, status? }`

## GET /api/follow/[userId]/followers

Get followers of user `[userId]`. Pagination params.

## GET /api/follow/[userId]/following

Get users that `[userId]` follows. Pagination params.

## GET /api/follow/[userId]/counts

Get follower/following counts for user.

## GET /api/follow/[userId]/mutual

Get mutual follows between current user and `[userId]`.

## Follow Requests (private accounts)

### GET /api/follow/requests

Get pending follow requests for current user (if private account).

### POST /api/follow/[userId]/approve

Approve a follow request. `[userId]` = requester.

### POST /api/follow/[userId]/reject

Reject a follow request.

### POST /api/follow/[userId]/remove

Remove a follower (revoke their follow).
