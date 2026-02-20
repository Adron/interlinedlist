# Folder Sync Documents Plan (Implemented)

This plan has been replaced by the Folder Sync Documents feature. See the implementation:

- **Schema**: `Folder` and `Document` models in `prisma/schema.prisma`
- **API**: `/api/documents/*`, `/api/documents/folders/*`, `/api/documents/sync`
- **Web UI**: `/documents`, folder tree, markdown editor with image upload
- **CLI**: Go-based sync daemon (see `cli/` when implemented)

The full plan is stored at `~/.cursor/plans/folder_sync_documents_plan_31cc3a53.plan.md`.

## Key Features

- Hierarchical folders and documents
- Markdown editor with auto-save (react-md-editor)
- Image upload (paste/drag) stored in Vercel Blob
- Bidirectional sync via CLI daemon (Go)
- Co-located images in local sync (document and images in same folder)
