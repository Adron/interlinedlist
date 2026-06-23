---
title: GitHub Integration
---

# GitHub Integration

These endpoints proxy a subset of the GitHub REST API on behalf of the authenticated user, using their **linked GitHub identity** as the credential. Connect GitHub first via OAuth — see [Authentication & OAuth](./authentication).

All endpoints require a session cookie (Bearer tokens are not accepted), and require an active linked GitHub identity. Errors from the upstream GitHub API are forwarded with their status code and `message` (mapped to `error`).

## Endpoint table

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/github/repos` | List repositories accessible to the linked GitHub account. |
| GET | `/api/github/issues` | List issues from a repository. Query: `repo=owner/repo`, optional `state`. |
| POST | `/api/github/issues` | Create an issue. |
| PATCH | `/api/github/issues/:owner/:repo/:number` | Update an existing issue's labels and/or assignees. |
| POST | `/api/github/issues/:owner/:repo/:number/comments` | Add a comment to an existing issue. |
| GET | `/api/github/repos/:owner/:repo/assignees` | Candidate assignees for the repository. |
| GET | `/api/github/repos/:owner/:repo/labels` | Defined labels for the repository. |
| GET | `/api/github/repos/:owner/:repo/next-issue-number` | Compute `max(issue number) + 1` (pull requests excluded). |

## Listing issues

```http
GET /api/github/issues?repo=owner/repo&state=open
```

`state` is `open` (default), `closed`, or `all`. The response is the raw GitHub issue array.

## Creating an issue

```http
POST /api/github/issues
Content-Type: application/json

{
  "repo": "owner/repo",
  "title": "Bug report",
  "body": "Details...",
  "labels": ["bug"],
  "assignees": ["octocat"]
}
```

Returns the upstream GitHub issue object.

## Updating an issue

```http
PATCH /api/github/issues/owner/repo/42
Content-Type: application/json

{ "labels": ["bug", "p1"], "assignees": ["octocat"] }
```

At least one of `labels` or `assignees` must be supplied (otherwise `400`). Non-string entries are silently filtered. Returns the updated issue.

## Adding a comment

```http
POST /api/github/issues/owner/repo/42/comments
Content-Type: application/json

{ "body": "Comment text" }
```

`body` must be a non-empty trimmed string. Returns the upstream GitHub comment object.

## Why these endpoints exist

They power features like GitHub-backed lists and the "create issue from message" affordance in the web app. Most of them are thin proxies — for general-purpose GitHub work, use the GitHub REST API directly with your own token. Use these only when your client is already authenticated against InterlinedList and you want to act as the user's linked GitHub identity without managing a separate token.
