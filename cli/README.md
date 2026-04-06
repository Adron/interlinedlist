# Document Sync CLI (`il-sync`)

The InterlinedList Document Sync CLI is a Go daemon that keeps local markdown files in sync with Documents on the interlinedlist.com site. Edit files in your favorite editor, and changes are pushed automatically; changes made on the web are pulled down to your machine.

## Build Steps

### Prerequisites

- **Go** 1.21+ (check with `go version`)

### Makefile Targets

From the `cli/` directory:

| Target | Description |
|--------|-------------|
| `make all` | Build binaries for all platforms (darwin, linux, windows) |
| `make build` | Build for current platform only (output: `dist/il-sync`) |
| `make darwin` | Build macOS binaries: `il-sync-darwin-amd64`, `il-sync-darwin-arm64` |
| `make linux` | Build Linux binaries: `il-sync-linux-amd64`, `il-sync-linux-arm64` |
| `make windows` | Build Windows binary: `il-sync-windows-amd64.exe` |
| `make test` | Run unit tests |
| `make test-integration` | Run integration tests (requires `-tags=integration`) |
| `make clean` | Remove `dist/` directory |

### Output Location

All built binaries are written to `cli/dist/`:

```
cli/dist/
├── il-sync-darwin-amd64
├── il-sync-darwin-arm64
├── il-sync-linux-amd64
├── il-sync-linux-arm64
└── il-sync-windows-amd64.exe
```

### Version Embedding

The binary version is embedded at build time via `main.version`, sourced from `git describe --tags --always --dirty` (or `"dev"` if not in a git repo).

---

## Integration with interlinedlist.com

### Build and Deploy Pipeline

From the **repository root**, use:

| Command | Purpose |
|--------|---------|
| `npm run deploy-all-production` | Build all platform binaries, copy into `public/downloads/`, print commit/deploy hints |
| `npm run cli:build` | Same build and copy steps, minimal output (used by automation) |

Both run `scripts/deploy-all-production.js`, which:

1. Runs `make -C cli all` to build all platform binaries
2. Creates `public/downloads/` subdirectories for each platform
3. Copies binaries into `public/downloads/`:

| Source | Destination |
|--------|--------------|
| `cli/dist/il-sync-darwin-arm64` | `public/downloads/darwin-arm64/il-sync` |
| `cli/dist/il-sync-darwin-amd64` | `public/downloads/darwin-amd64/il-sync` |
| `cli/dist/il-sync-linux-amd64` | `public/downloads/linux-amd64/il-sync` |
| `cli/dist/il-sync-linux-arm64` | `public/downloads/linux-arm64/il-sync` |
| `cli/dist/il-sync-windows-amd64.exe` | `public/downloads/windows/il-sync.exe` |

### How Binaries Are Served

- Next.js serves files in `public/` as static assets at the root URL path.
- Binaries are therefore available at:
  - `https://interlinedlist.com/downloads/darwin-arm64/il-sync`
  - `https://interlinedlist.com/downloads/darwin-amd64/il-sync`
  - `https://interlinedlist.com/downloads/linux-amd64/il-sync`
  - `https://interlinedlist.com/downloads/linux-arm64/il-sync`
  - `https://interlinedlist.com/downloads/windows/il-sync.exe`

### Where the Site Links to Downloads

- **Help system**: The in-app help sidebar includes **Tooling (CLI)**.
- **Documentation**: `documentation/help/tooling.md` contains download links and install instructions; this content is rendered in the help UI at `/help/tooling` and links to the `/downloads/...` URLs above.
- **Contributors** testing the CLI against a local Next.js server: [`documentation/developer/cli-against-local-server.md`](../documentation/developer/cli-against-local-server.md).

### Deployment

- `public/downloads/` is committed to the repo (or produced during build) and deployed with the rest of the Next.js app.
- On Vercel (or similar), the `vercel-build` script runs `prisma migrate deploy && next build`; it does **not** run `cli:build` by default.
- To ship new CLI binaries with a deployment, run `npm run deploy-all-production` (or `npm run cli:build`), commit `public/downloads/` if you version binaries in git, then deploy. Vercel’s default `vercel-build` does not run this automatically unless you add it to the build command.

---

## Usage (End Users)

See the in-app help ("Tooling (CLI)") or `documentation/help/tooling.md` for:

- Download links and installation steps
- `il-sync init` (setup with email/password)
- `il-sync` (run daemon)
- `il-sync --install` / `il-sync --verify`
