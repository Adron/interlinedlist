---
title: Tooling (CLI)
---

# Document Sync CLI

The InterlinedList Document Sync CLI is a daemon that keeps your local markdown files in sync with your Documents on the website. Edit files in your favorite editor, and changes are pushed automatically. Changes made on the web are pulled down to your machine.

## Download

Pre-built binaries are available for Windows, macOS, and Linux. Each download is named `il-sync` (or `il-sync.exe` on Windows):

- **macOS (Apple Silicon M1/M2/M3)** — [il-sync](/downloads/darwin-arm64/il-sync)
- **macOS (Intel x86_64)** — [il-sync](/downloads/darwin-amd64/il-sync)
- **Windows (64-bit)** — [il-sync.exe](/downloads/windows/il-sync.exe)
- **Linux (x86_64)** — [il-sync](/downloads/linux-amd64/il-sync)
- **Linux (ARM64)** — [il-sync](/downloads/linux-arm64/il-sync)

After downloading, make the file executable on macOS/Linux: `chmod +x il-sync`

---

## Installation

### macOS

1. Download the appropriate binary (Apple Silicon or Intel) from the list above.
2. Move it to a directory in your PATH, for example:
   ```bash
   mv ~/Downloads/il-sync /usr/local/bin/il-sync
   chmod +x /usr/local/bin/il-sync
   ```
3. Run `sync init` to configure:
   ```bash
   il-sync sync init
   ```
4. Follow the prompts to set your sync root folder, server URL, and API key.

### Linux

1. Download the appropriate binary (amd64 or arm64) from the list above.
2. Move it to a directory in your PATH:
   ```bash
   mv ~/Downloads/il-sync /usr/local/bin/il-sync
   chmod +x /usr/local/bin/il-sync
   ```
3. Run `sync init` to configure:
   ```bash
   il-sync sync init
   ```
4. Follow the prompts to set your sync root folder, server URL, and API key.

### Windows

1. Download `il-sync.exe` from the list above.
2. Place it in a folder in your PATH (e.g. `C:\Program Files\InterlinedList\` or your user `bin` folder).
3. Open Command Prompt or PowerShell and run:
   ```cmd
   il-sync.exe sync init
   ```
4. Follow the prompts to set your sync root folder, server URL, and API key.

---

## Getting an API Key

The CLI uses an API key instead of a password. Create one from the website:

1. Log in and go to **Settings**
2. In the **Document Sync (CLI)** section, click **Create API key**
3. Copy the key immediately — it is shown only once
4. Paste it when prompted during `sync init`

---

## Running the Sync Daemon

### Option 1: Run in the foreground

Start the daemon directly. It will watch your sync folder and push/pull changes:

```bash
il-sync
```

Press Ctrl+C to stop.

### Option 2: Install as a system service (recommended)

Install the daemon so it runs automatically in the background:

```bash
il-sync --install
```

This installs it as an OS service (launchd on macOS, systemd on Linux, Windows Service on Windows). The daemon will start on boot and keep running.

### Verify installation

To check that the service is installed and running:

```bash
il-sync --verify
```

---

## What the CLI Does

| Feature | Description |
|---------|-------------|
| **Push** | When you save a `.md` file locally, the daemon uploads it (and any referenced images) to your Documents on the website. |
| **Pull** | Every 30 seconds, the daemon fetches changes from the website and writes them to your local folder. |
| **Recursive watching** | All nested folders under your sync root are watched. Create a new subfolder and it is included automatically. |
| **Image sync** | Images referenced in markdown (e.g. `![](./photo.png)`) are uploaded to the server and the links are rewritten to blob URLs. On pull, blob images are downloaded and saved locally with relative paths. |

---

## Other Functionality

### `sync init`

Interactive setup. Prompts for:

- **Sync root path** — The local folder that contains your markdown files (e.g. `~/Documents/notes`)
- **Server URL** — Your InterlinedList instance (e.g. `https://app.example.com`)
- **API key** — Created from Settings → Document Sync (CLI)

Config is saved to:

- **macOS/Linux**: `~/.config/interlinedlist/sync.json`
- **Windows**: `%APPDATA%\InterlinedList\sync.json`

### `--install`

Installs the daemon as an OS service so it runs in the background and starts on boot. Requires that `sync init` has been run first.

### `--verify`

Checks whether the daemon is installed and running. Prints a success message or an error.

---

## What to Expect

- **Debounce**: After a file change, the daemon waits about 3 seconds before pushing to avoid excessive uploads during rapid edits.
- **Pull interval**: Changes from the web are pulled every 30 seconds.
- **Logs**: When run in the foreground, the daemon logs push/pull activity. When run as a service, check your OS logs (e.g. `journalctl` on Linux, Console.app on macOS).
- **First run**: Run a pull first by starting the daemon; it will fetch your existing documents. Then push any local changes.

---

## Local Testing

To test the CLI against a local dev server instead of production, see [Local Testing](/help/local-testing).

## Troubleshooting

- **"Config missing or invalid"** — Run `il-sync sync init` first.
- **"Push skipped: no API key configured"** — Add your API key via `sync init` or edit the config file.
- **401 Unauthorized** — Your API key may be invalid. Create a new one in Settings and run `sync init` again.
- **Image upload fails** — Ensure the document exists on the server first (push runs create before image upload).
