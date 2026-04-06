---
title: Documents
---

# Documents

Documents let you create and organize markdown files with folders. Use them for notes, wikis, or any text content. Documents support images. Most people write and edit entirely in the browser; you can also **optionally** install the Document Sync CLI to keep a folder on your computer in sync with the same documents (see **Tooling (CLI)**).

## What Are Documents?

Documents are markdown files stored in a folder hierarchy. Each document has:

- **Title** — Shown in the folder tree and document list
- **Content** — Markdown with support for headings, lists, links, images, and more
- **Folder** — Optional parent folder for organization

Documents can be public (viewable by anyone) or private (only you).

## Accessing Documents

1. Click **Documents** in the top navigation
2. Use the folder tree on the left to browse
3. Click a folder to see its documents
4. Click a document to open it in the editor

## Creating a Document

### From the web

1. Go to **Documents**
2. Select the folder where you want the document (or leave at root)
3. Click **New Document**
4. Enter a title and start writing
5. Changes save automatically shortly after you pause typing (about a second), and about every eight seconds while you keep typing without a pause

### From a folder

1. Navigate to a folder
2. Click **New Document** in that folder
3. Enter a title and content

## Creating Folders

1. Go to **Documents**
2. Click **New Folder** (at root) or use the folder menu in the tree to add a subfolder
3. Enter a folder name
4. Folders can be nested to build a hierarchy

## Editing Documents

- Click any document to open the markdown editor
- Edit in place; the editor saves on its own after you pause, on a timer while you type continuously, when you switch tabs or leave the page, and when you change the **Public** toggle. There is no separate Save button; if a save fails, use **Retry** next to the error message
- Use the toolbar for formatting (bold, italic, headings, lists, links)
- Paste or drag images into the editor to upload them

## Images in Documents

- **Paste** — Copy an image and paste (Ctrl+V / Cmd+V) into the editor
- **Drag and drop** — Drag an image file onto the editor
- Images are uploaded to cloud storage and embedded with a URL
- When syncing with the CLI, local images (e.g. `![](./photo.png)`) are uploaded and the links are rewritten

## Optional: syncing with the Document Sync CLI

If you prefer a desktop editor, use the Document Sync CLI. It watches a folder on your computer and:

- **Pushes** local changes to the website
- **Pulls** changes from the website to your local folder
- Handles images: uploads local images on push, downloads blob images on pull

During setup (`il-sync init`), you enter your email and password. The CLI authenticates and stores a sync token automatically — no API key to manage.

See **Tooling (CLI)** in the Help sidebar for setup and usage.

## Public vs Private

- **Private** (default) — Only you can view and edit
- **Public** — Anyone with the link can view (read-only)

Set visibility when creating or editing a document.

## Related

- **Tooling (CLI)** — Download, install, and configure the optional sync tool
