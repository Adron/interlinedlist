#!/usr/bin/env node
/**
 * InterlinedList Documentation Generator
 *
 * Uses the Claude API with tool use to explore the codebase and produce
 * documentation from one of three points of view:
 *
 *   devops  → docs/operational.md     (deployment, infra, env vars, crons, migrations)
 *   user    → docs/user-guide.md      (end-user site guide: posting, lists, settings)
 *   api     → docs/api-reference.md   (API endpoints, auth, request/response shapes)
 *
 * Usage:
 *   node scripts/generate-docs.js --perspective devops
 *   node scripts/generate-docs.js --perspective user
 *   node scripts/generate-docs.js --perspective api
 *   node scripts/generate-docs.js --perspective all   (runs all three sequentially)
 *
 * Requires ANTHROPIC_API_KEY in the environment (or .env / .env.local).
 */

'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Bootstrap env from .env.local → .env (for local runs without dotenv-cli)
// ---------------------------------------------------------------------------
for (const envFile of ['.env.local', '.env']) {
  const fullPath = path.join(__dirname, '..', envFile);
  if (fs.existsSync(fullPath)) {
    const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const MODEL = 'claude-sonnet-4-6';
const MAX_TOOL_CALLS = 60;

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const perspectiveArg = (args[args.indexOf('--perspective') + 1] || '').toLowerCase();
if (!perspectiveArg || !['devops', 'user', 'api', 'all'].includes(perspectiveArg)) {
  console.error('Usage: node scripts/generate-docs.js --perspective devops|user|api|all');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tools the agent can call
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    name: 'read_file',
    description: 'Read the contents of a file from the project root. Returns the file content truncated at 30 000 characters.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path relative to the project root, e.g. "app/api/messages/route.ts"' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_directory',
    description: 'List the immediate contents (files and subdirectories) of a directory.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path relative to the project root. Use "" or "." for the root.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_code',
    description: 'Search for a pattern in the codebase using grep. Returns up to 60 matching lines with file paths and line numbers.',
    input_schema: {
      type: 'object',
      properties: {
        pattern:      { type: 'string', description: 'Grep-compatible pattern (no need to escape for shell; the tool handles it).' },
        directory:    { type: 'string', description: 'Directory to search in, relative to project root. Defaults to the whole project.' },
        file_pattern: { type: 'string', description: 'Glob pattern to restrict which files are searched, e.g. "*.ts" or "*.env*".' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'find_files',
    description: 'Find files matching a name or glob pattern within a directory.',
    input_schema: {
      type: 'object',
      properties: {
        name_pattern: { type: 'string', description: 'Shell glob or exact name, e.g. "route.ts", "*.env*", "migration.sql".' },
        directory:    { type: 'string', description: 'Directory to search in, relative to project root. Defaults to project root.' },
      },
      required: ['name_pattern'],
    },
  },
  {
    name: 'write_documentation',
    description: 'Write the completed documentation to the docs/ directory. Call this exactly once, as the final action, after all research is done.',
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Output filename inside docs/, e.g. "operational.md".' },
        content:  { type: 'string', description: 'Full markdown documentation. Should be thorough — this is the deliverable.' },
      },
      required: ['filename', 'content'],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------
function runTool(name, input) {
  try {
    switch (name) {
      case 'read_file': {
        const abs = path.join(PROJECT_ROOT, input.path);
        if (!abs.startsWith(PROJECT_ROOT)) return 'Error: path escapes project root.';
        const text = fs.readFileSync(abs, 'utf-8');
        return text.length > 30000 ? text.slice(0, 30000) + '\n\n[...truncated at 30 000 chars]' : text;
      }

      case 'list_directory': {
        const abs = path.join(PROJECT_ROOT, input.path || '.');
        if (!abs.startsWith(PROJECT_ROOT)) return 'Error: path escapes project root.';
        const entries = fs.readdirSync(abs, { withFileTypes: true });
        return entries
          .map(e => `${e.isDirectory() ? '[dir] ' : '[file]'} ${e.name}`)
          .join('\n') || '(empty)';
      }

      case 'search_code': {
        const dir = input.directory
          ? path.join(PROJECT_ROOT, input.directory)
          : PROJECT_ROOT;
        const include = input.file_pattern ? `--include="${input.file_pattern}"` : '';
        const escaped = input.pattern.replace(/'/g, "'\\''");
        const cmd = `grep -r ${include} -n --color=never '${escaped}' "${dir}" 2>/dev/null | grep -v node_modules | grep -v '.next' | head -60`;
        try {
          return execSync(cmd, { encoding: 'utf-8' }) || '(no matches)';
        } catch {
          return '(no matches)';
        }
      }

      case 'find_files': {
        const dir = input.directory
          ? path.join(PROJECT_ROOT, input.directory)
          : PROJECT_ROOT;
        const pat = input.name_pattern.replace(/'/g, "'\\''");
        const cmd = `find "${dir}" -name '${pat}' -not -path '*/node_modules/*' -not -path '*/.next/*' 2>/dev/null | head -50`;
        try {
          return execSync(cmd, { encoding: 'utf-8' }) || '(no matches)';
        } catch {
          return '(no matches)';
        }
      }

      case 'write_documentation': {
        fs.mkdirSync(DOCS_DIR, { recursive: true });
        const out = path.join(DOCS_DIR, input.filename);
        fs.writeFileSync(out, input.content, 'utf-8');
        return `Written to docs/${input.filename} (${input.content.length} chars)`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Tool error: ${err.message}`;
  }
}

// ---------------------------------------------------------------------------
// System prompts by perspective
// ---------------------------------------------------------------------------
const SYSTEM_PROMPTS = {
  devops: `You are a senior DevOps/platform engineer writing the **Operational Guide** for InterlinedList — a Next.js 14 App Router social-posting SaaS deployed on Vercel with a PostgreSQL database (Neon or similar), Prisma ORM, Stripe subscriptions, Resend email, Apple Push Notification Service (APNS), Vercel Blob storage, and OAuth integrations with LinkedIn, Mastodon, Bluesky, and GitHub.

Your job is to explore the codebase and produce docs/operational.md: a comprehensive, accurate operational reference for the engineering team responsible for deploying, configuring, and maintaining the service.

## What to research and document

1. **Environment variables** — read every .env* file (look for .env, .env.example, .env.local.example, etc.) and scan source for process.env references. Document each variable: what it does, whether it is required, safe values for local dev vs production.

2. **Database** — Prisma schema, migration workflow (npm scripts: db:migrate, db:migrate:deploy, db:migrate:diagnose), how to set up from scratch, backup/restore scripts, connection string format.

3. **Deployment** — the vercel-build npm script, what it does step by step, Vercel project settings implied by the code, build/start scripts, any edge/serverless function requirements.

4. **Cron jobs** — find all /api/cron/* routes; document what each does, how often it should run, and how to configure it (CRON_SECRET env var, Vercel Cron config in vercel.json if present).

5. **Authentication & OAuth setup** — internal session auth plus each OAuth provider (LinkedIn, Mastodon, Bluesky/ATProto, GitHub). What API keys / credentials / redirect URIs are needed for each.

6. **Push notifications (APNS)** — find the APNS/push code; document required certificates or keys, how to configure, and how the push registration flow works.

7. **Email (Resend)** — what keys are needed, which email flows exist (verification, password reset, etc.).

8. **Stripe** — webhook signing secret, which price/product IDs are referenced, what webhooks need to be configured.

9. **Blob storage (Vercel Blob)** — which env vars, what is stored.

10. **npm scripts** — document every script in package.json relevant to operations.

11. **Local development setup** — step-by-step from clone to running app locally, including database seeding.

12. **Monitoring & logging** — any logging utilities, error tracking, health endpoints.

## Output format

Write well-structured Markdown with clear headings, tables for environment variables, and code blocks for commands. Be precise and complete — this document should let a new engineer stand up the service from scratch.

Use the tools to explore the actual codebase. Do not invent information. If something is unclear from the code, say so.`,

  user: `You are a technical writer creating the **End-User Guide** for InterlinedList — a social micro-blogging and data-list SaaS. Your audience is a non-technical end user who wants to understand how to use the website.

Your job is to explore the codebase (pages, components, API routes) and produce docs/user-guide.md: a friendly, complete guide covering every user-facing feature.

## What to research and document

1. **What InterlinedList is** — infer from the app's pages, components, and data model what the product does and who it is for.

2. **Account management** — registration (email + password, any OAuth signup), email verification, login, logout, password reset, profile settings (display name, bio, avatar, theme), account deletion.

3. **Posting messages** — composing a message, character limits, attaching images and videos, public vs private, tagging, replying, quoting/pushing.

4. **Cross-posting** — connecting Mastodon accounts, Bluesky, LinkedIn; how to toggle cross-posting per platform when composing a message; what gets posted.

5. **Scheduling posts** — how to schedule, how to view/edit/delete scheduled posts.

6. **Tags** — what they are, how to add them, how to browse by tag.

7. **Lists** — creating a list, the DSL schema, adding/editing data rows, watching a list, exporting.

8. **Documents** — creating documents, folders, templates, syncing.

9. **Organizations** — creating an org, adding members, roles.

10. **Following & followers** — follow requests, approval, mutual follows, blocking-style removal.

11. **Notifications** — what triggers them, mark as read, notification centre.

12. **Subscriptions** — what the paid tier unlocks (advanced posting options, higher character limits, etc.), how to subscribe/manage via Stripe portal.

13. **Settings** — every setting available in Profile Settings.

14. **Mobile / push notifications** — how to register a device (iOS), what notifications are sent.

15. **Data exports** — what can be exported and how.

## Output format

Write friendly, clear Markdown. Use numbered steps for workflows. Include a table of contents. Avoid jargon. This document is for the end user, not an engineer — do not reference code file names or implementation details.`,

  api: `You are a developer-experience engineer writing the **API Reference** for InterlinedList — a Next.js 14 App Router application whose Next.js API routes form an HTTP API. Your audience is a developer who wants to integrate with or build on top of the InterlinedList API.

Your job is to explore every file under app/api/ and produce docs/api-reference.md: a complete, accurate API reference.

## What to research and document

1. **Authentication** — how sessions work (cookies, tokens), how to authenticate API requests, any API key / bearer token mechanism, the sync-token endpoint, OAuth flows that external clients may need.

2. **Base URL** — note that all endpoints are relative to the deployment root.

3. **Every endpoint** — for each route file under app/api/, document:
   - HTTP method(s) and full path (with path params noted)
   - Whether authentication is required
   - Request body shape (JSON fields, types, required/optional)
   - Query parameters
   - Response body shape (success and error)
   - Notable behaviour or side effects (e.g. triggers email, cross-posts, etc.)

   Group endpoints by resource area: Auth, Messages, Lists, Documents, Organizations, Users/Following, Notifications, Push, Exports, Admin, Crons, Webhooks, Misc.

4. **Error format** — the standard error JSON shape returned across all routes.

5. **Cross-posting flags** — document the cross-posting fields accepted by POST /api/messages (mastodonProviderIds, crossPostToBluesky, crossPostToLinkedIn, linkedInLinkAsFirstComment, etc.).

6. **Scheduled messages** — the scheduledAt field and scheduledCrossPostConfig structure.

7. **File uploads** — image and video upload endpoints, expected content types, size limits.

8. **Cron endpoints** — document that these are secured by CRON_SECRET and not intended for public use.

9. **Webhook endpoints** — Stripe and Resend webhooks; note they are verified by signature and not callable directly.

10. **Rate limits** — document any rate limiting found in the code.

## Output format

Write precise, developer-focused Markdown. Use a table of contents. For each endpoint use a consistent structure:

\`\`\`
### METHOD /api/path
Auth required: yes/no
Request body: ...
Response: ...
\`\`\`

Include realistic JSON examples for complex bodies. This document should let a developer call any endpoint without reading the source code.`,
};

const OUTPUT_FILES = {
  devops: 'operational.md',
  user:   'user-guide.md',
  api:    'api-reference.md',
};

// ---------------------------------------------------------------------------
// Main agentic loop
// ---------------------------------------------------------------------------
async function generateDocs(perspective) {
  const client = new Anthropic.default();
  const systemPrompt = SYSTEM_PROMPTS[perspective];
  const outputFile = OUTPUT_FILES[perspective];

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Generating docs: ${perspective} → docs/${outputFile}`);
  console.log('='.repeat(60));

  const messages = [
    {
      role: 'user',
      content: `Please explore the InterlinedList codebase and write the documentation for the **${perspective}** perspective. Use your tools to read real files and produce accurate, thorough documentation. When you are done with your research, call write_documentation to save the result.`,
    },
  ];

  let toolCallCount = 0;
  let done = false;

  while (!done && toolCallCount < MAX_TOOL_CALLS) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: TOOLS,
      messages,
    });

    // Append assistant turn
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      done = true;
      console.log('\n✓ Agent finished without calling write_documentation (text-only response).');
      break;
    }

    if (response.stop_reason !== 'tool_use') {
      done = true;
      break;
    }

    // Process all tool calls in this response
    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      toolCallCount++;
      console.log(`  [${toolCallCount}] ${block.name}(${JSON.stringify(block.input).slice(0, 120)})`);

      const result = runTool(block.name, block.input);

      if (block.name === 'write_documentation') {
        console.log(`  → ${result}`);
        done = true;
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  if (toolCallCount >= MAX_TOOL_CALLS) {
    console.warn(`\n⚠ Reached tool call limit (${MAX_TOOL_CALLS}). Documentation may be incomplete.`);
  }

  const outPath = path.join(DOCS_DIR, outputFile);
  if (fs.existsSync(outPath)) {
    console.log(`\n✓ docs/${outputFile} written (${fs.statSync(outPath).size} bytes)`);
  } else {
    console.warn(`\n⚠ docs/${outputFile} was not written by the agent.`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
(async () => {
  const perspectives = perspectiveArg === 'all'
    ? ['devops', 'user', 'api']
    : [perspectiveArg];

  for (const p of perspectives) {
    await generateDocs(p);
  }

  console.log('\nDone.');
})().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
