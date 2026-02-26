---
title: Lists
---

# Lists

Lists let you organize and manage structured data with custom fields.

## Creating a List

1. Go to **Lists** from the top navigation
2. Click **New List**
3. Choose **Local List** or **GitHub-backed List** (see tabs)

### Local List

1. Enter a title and optional description
2. Define your schema (fields) using the form builder
3. Optionally set a parent list and visibility (public/private)

### GitHub-backed List

Lists that sync with GitHub Issues from a repository:

1. **Prerequisite**: Connect GitHub with the **Issues** scope in Settings → Security (Connected Accounts). If you already linked GitHub for sign-in, you may need to click **Reconnect for GitHub Issues** to grant access.
2. On the **GitHub-backed List** tab, select a repository you have access to
3. Enter a list title (defaults to the repo name)
4. Optionally set a parent list to organize it in your list hierarchy
5. Toggle **Public list** if you want others to see it

GitHub-backed lists display a GitHub icon and sync issues from the selected repo. Rows map to GitHub issues (title, body, labels, assignees, state). You can add rows (creates issues), edit rows (updates issues), and delete rows (closes issues).

## Create List from Message

Use the list-plus icon on any message to create a new list with that message. The message content is used as the list description, and the app may suggest a list name extracted from the message. This is a quick way to turn a message into a structured list.

## Schema and Fields

Each list has a **schema** that defines what data you can store:

- **Field types**: Text, number, date, email, URL, select, checkbox, and more
- **Validation**: Required fields, min/max values, patterns
- **Help text**: Add hints for each field to guide users

## Child Lists

Lists can have a parent-child relationship, forming a tree:

- Create a parent list first (e.g., "Projects")
- When creating a new list (local or GitHub-backed), optionally set a parent
- Use breadcrumbs to navigate up and down the hierarchy
- For GitHub-backed lists, use **Edit** to change the parent after creation

## Adding Rows

Once your schema is set:

1. Open a list
2. Click **Add Row**
3. Fill in the form

You can edit rows by clicking the edit icon in the table, or delete rows if needed.

## Editing the Schema

- **Local lists**: Click **Edit** (or **Edit Schema**) to change fields, parent list, and visibility. You can add, remove, or modify fields. Existing data will be preserved where possible.
- **GitHub-backed lists**: The schema is fixed (GitHub issues). Click **Edit** to change the **parent list** only. You cannot modify the issue fields (title, body, labels, assignees) through the schema—they are defined by GitHub.

## Refresh from GitHub (GitHub-backed lists)

On a GitHub-backed list, use **Refresh from GitHub** to sync the latest issues from the repository. The list caches issues locally; refresh when you want to pull new or updated issues.

## Public vs Private

- **Private lists** (default): Only you can see and edit them
- **Public lists**: Set "Public" when creating or editing to make them visible to others. Public lists can be viewed by anyone and support list access and permissions.

## List Access & Permissions

For **public lists**, you can manage who has access and at what level. The "List access & permissions" section appears below the list table (main view) and in the Edit Schema view.

### Roles

- **Watcher** — Can follow this list. Shown when viewing your public profile.
- **Collaborator** — Can add, edit, and delete rows in this list.
- **Manager** — Can do everything a Collaborator can, plus edit the list schema.

### Managing Access (List Owner)

1. Open a public list (main view or Edit Schema)
2. Scroll to "List access & permissions" below the table
3. Search for users and add them with a role (Watcher, Collaborator, or Manager)
4. Change a user's role or remove access using the table controls

## Viewing Other Users' Lists

When you visit another user's profile at `/user/[username]`, you see their public lists in a tree on the left. Click a list to open it at `/user/[username]/lists/[id]`.

- **Read-only view** — You can browse the list data but cannot edit
- **Watch button** — In the tree view, a "Watch" button appears next to each list (when logged in and viewing someone else's profile). Click to add yourself as a watcher
- **Add self as watcher** — On the public list page, an "Add self as watcher to list?" button appears when you are logged in, not the owner, and not already watching

## Watched Lists

On the **Lists** page (`/lists`), a datagrid shows lists you watch or have access to (watcher, collaborator, or manager). Each entry shows the list title, owner, your role, and a link to view the list.
