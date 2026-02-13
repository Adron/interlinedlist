# API Overview

## Base URL

- Local: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication

Most endpoints require authentication via session cookie. The `session` cookie is set on login and sent automatically by the browser.

- **401 Unauthorized**: No session or invalid session
- **403 Forbidden**: Authenticated but not allowed (e.g. email not verified)

## Error Format

```json
{
  "error": "Error message string"
}
```

Some endpoints return additional fields (e.g. `details` for validation errors).

## Pagination

Common query params:

- `limit` — Page size (default varies by endpoint)
- `offset` — Skip N items
- `page` — 1-based page number (alternative to offset)

Response often includes:

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

## API Index

| Area | Endpoints |
|------|-----------|
| [Lists](lists.md) | `/api/lists`, `/api/lists/[id]`, schema, data |
| [Messages](messages.md) | `/api/messages`, `/api/messages/[id]` |
| [Auth](auth.md) | login, register, logout, password reset, OAuth |
| [Organizations](organizations.md) | CRUD, members |
| [User](user.md) | profile, avatar, identities, update |
| [Exports](exports.md) | messages, lists, follows, list-data-rows |
| [Follow](follow.md) | follow, unfollow, followers, following, requests |
