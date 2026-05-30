# InterlinedList — Architecture, API & Application Design

Developer documentation for contributors and API consumers.

## Quick Start (Contributors)

1. **Clone and setup**: See [README.md](../../README.md) for database setup and environment variables.
2. **Start dev server**: `npm run dev`
3. **Database**: Prisma + PostgreSQL; migrations in `prisma/migrations/`
4. **Styling**: Bootstrap 5 + Darkone theme; `app/globals.css` for CSS variables

## Documentation Index

### Architecture

- [Overview](architecture/overview.md) — Tech stack, high-level architecture
- [Data Model](architecture/data-model.md) — Prisma schema, entities, relationships
- [Auth Flow](architecture/auth-flow.md) — Session, OAuth, middleware

### API Reference

- [API Overview](api/README.md) — Base URL, auth, error format, pagination
- [Lists API](api/lists.md)
- [Messages API](api/messages.md)
- [Auth API](api/auth.md)
- [Organizations API](api/organizations.md)
- [User API](api/user.md)
- [Export API](api/exports.md)
- [Follow API](api/follow.md)

### Application Design

- [App Overview](application-design/overview.md) — `app/` structure, routing, `lib/` layout
- [Components](application-design/components.md) — Key components and hierarchy
- [Styling](application-design/styling.md) — Theme, CSS variables, Darkone SCSS
