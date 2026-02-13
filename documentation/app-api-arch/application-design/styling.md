# Styling

## Theme System

- **CSS variables** in `app/globals.css`:
  - `:root` — light theme
  - `[data-theme="dark"]` — dark theme
- Variables: `--color-bg`, `--color-text`, `--color-link`, `--color-button-primary`, etc.
- Bootstrap `data-bs-theme` set via `ThemeBridgeInit` for Bootstrap components

## Key Variables

| Variable | Light | Dark |
|----------|-------|------|
| `--color-bg` | #ffffff | #1a1a1a |
| `--color-text` | #333333 | #ffffff |
| `--color-link` | #0070f3 | #4a9eff |
| `--color-button-primary` | #0070f3 | #4a9eff |

## Darkone Theme

- SCSS in `styles/darkone/` (or `styles/`)
- Imported via `app/layout.tsx`: `../styles/darkone.scss`
- Provides Bootstrap overrides, topbar, sidebar, cards, etc.

## Container

- `container-fluid container-fluid-max` — common page wrapper
- `py-4` — vertical padding

## Typography

- Font: `"Play"` (Google Fonts) + system fallbacks
- Headings: `h1`, `h2`, `h3` classes
