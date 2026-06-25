#!/usr/bin/env node
/**
 * Deterministic OpenAPI 3.1 generator for InterlinedList.
 *
 * No API key, no LLM, no network. The spec is derived entirely from things that
 * already exist in the repo, so it is always in sync with the code:
 *
 *   1. The route tree under app/api/ is the source of truth for PATHS + METHODS.
 *      Every handler exports `GET`/`POST`/... and its folder path encodes the URL
 *      (`[id]` -> `{id}`), so coverage is complete with zero annotations.
 *   2. The leading JSDoc comment on a handler (when present) becomes its summary.
 *   3. docs/api-reference.md (the canonical human-maintained reference) is parsed
 *      to enrich operations with request/response examples where it has clean JSON.
 *
 * Auth (session-cookie-only vs public vs default bearer/cookie) is applied from
 * the same rules documented in docs/api-reference.md.
 *
 * Usage:  node scripts/generate-openapi.js   (writes docs/openapi.json)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(PROJECT_ROOT, 'app');
const API_DIR = path.join(APP_DIR, 'api');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const OUT_FILE = path.join(DOCS_DIR, 'openapi.json');
const REFERENCE_MD = path.join(DOCS_DIR, 'api-reference.md');

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));

// ---------------------------------------------------------------------------
// 1. Walk the route tree
// ---------------------------------------------------------------------------
function walkRouteFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRouteFiles(full, acc);
    } else if (/^route\.(ts|js)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Convert a route file's directory into an OpenAPI path (`[id]` -> `{id}`). */
function fileToApiPath(absFile) {
  const rel = path.relative(APP_DIR, path.dirname(absFile));
  const segments = rel
    .split(path.sep)
    .filter(Boolean)
    .filter((s) => !(s.startsWith('(') && s.endsWith(')'))) // route groups
    .map((seg) => {
      const catchAll = seg.match(/^\[\[?\.\.\.(.+?)\]?\]$/); // [...x] or [[...x]]
      if (catchAll) return `{${catchAll[1]}}`;
      const param = seg.match(/^\[(.+?)\]$/);
      if (param) return `{${param[1]}}`;
      return seg;
    });
  return '/' + segments.join('/');
}

/** Which HTTP methods does this route file export? */
function detectMethods(content) {
  const found = [];
  for (const m of METHODS) {
    const M = m.toUpperCase();
    const re = new RegExp(`export\\s+(?:async\\s+)?function\\s+${M}\\b|export\\s+const\\s+${M}\\s*=`);
    if (re.test(content)) found.push(m);
  }
  return found;
}

/** Trim a string to its first sentence and a reasonable length. */
function shorten(s) {
  let t = s.replace(/\s+/g, ' ').trim();
  const dot = t.indexOf('. ');
  if (dot > 0) t = t.slice(0, dot + 1);
  return t.length > 120 ? t.slice(0, 117) + '...' : t;
}

/** Pull the summary from a JSDoc block immediately above the handler, if any. */
function summaryFor(content, method) {
  const M = method.toUpperCase();
  const re = new RegExp(`export\\s+(?:async\\s+)?function\\s+${M}\\b|export\\s+const\\s+${M}\\s*=`);
  const m = re.exec(content);
  if (!m) return null;
  const before = content.slice(0, m.index);
  const close = before.lastIndexOf('*/');
  if (close === -1) return null;
  // The block must be adjacent to the export (only whitespace between them).
  if (before.slice(close + 2).trim() !== '') return null;
  const open = before.lastIndexOf('/**', close);
  if (open === -1) return null;
  const lines = before
    .slice(open, close)
    .split('\n')
    .map((l) => l.replace(/^\s*\/?\*+/, '').trim())
    .filter((l) => l && l !== '/');
  // Drop a leading "GET /api/..." route line; keep the first description line.
  const desc = lines.filter((l) => !/^(GET|POST|PUT|PATCH|DELETE)\s+\/api/i.test(l));
  if (!desc.length) return null;
  return shorten(desc[0]);
}

// ---------------------------------------------------------------------------
// 2. Tag resolution (longest/most-specific rule wins)
// ---------------------------------------------------------------------------
function resolveTag(p) {
  if (p.startsWith('/api/auth/linkedin')) return 'LinkedIn';
  if (p.startsWith('/api/auth')) return 'Authentication';
  if (p.startsWith('/api/messages')) return 'Messages';
  if (p.startsWith('/api/lists')) return 'Lists';
  if (p.startsWith('/api/users')) {
    if (p.includes('/lists')) return 'Lists';
    if (p.includes('/documents')) return 'Documents';
    return 'Users & Profile';
  }
  if (p.startsWith('/api/user')) return 'Users & Profile';
  if (p.startsWith('/api/folders')) return 'List Folders';
  if (p.startsWith('/api/documents/folders')) return 'Document Folders';
  if (p.startsWith('/api/documents')) return 'Documents';
  if (p.startsWith('/api/follow')) return 'Following';
  if (p.startsWith('/api/organizations')) return 'Organizations';
  if (p.startsWith('/api/notifications')) return 'Notifications';
  if (p.startsWith('/api/push')) return 'Push Notifications';
  if (p.startsWith('/api/exports')) return 'Exports';
  if (p.startsWith('/api/github')) return 'GitHub';
  if (p.startsWith('/api/linkedin')) return 'LinkedIn';
  if (p.startsWith('/api/stripe')) return 'Billing';
  if (p.startsWith('/api/admin')) return 'Admin';
  if (p.startsWith('/api/webhooks') || p.startsWith('/api/cron')) return 'Webhooks & Cron';
  if (/^\/api\/(location|weather|images|analytics|oauth|architecture-aggregates|test-db)/.test(p)) return 'Utility';
  const seg = p.split('/')[2] || 'General';
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

const TAG_ORDER = [
  'Authentication', 'Messages', 'Lists', 'List Folders', 'Documents', 'Document Folders',
  'Users & Profile', 'Following', 'Organizations', 'Notifications', 'Push Notifications',
  'Exports', 'GitHub', 'LinkedIn', 'Utility', 'Billing', 'Admin', 'Webhooks & Cron',
];
const TAG_DESCRIPTIONS = {
  'Authentication': 'Login, registration, sync tokens, password reset, account switching, OAuth provider flows.',
  'Messages': 'Posting, replies, dig reactions, scheduled posts, media uploads, cross-posting.',
  'Lists': 'List CRUD, schema/DSL, data rows, watchers, connections, search.',
  'List Folders': 'Folder hierarchy for organising lists.',
  'Documents': 'Document CRUD, delta sync, templates, search, image uploads.',
  'Document Folders': 'Folder hierarchy for organising documents.',
  'Users & Profile': 'Current user, profile updates, avatars, linked identities, public profiles.',
  'Following': 'Follow/unfollow, follow requests, follower & following lists.',
  'Organizations': 'Org CRUD, members, LinkedIn page integration. Session cookie required.',
  'Notifications': 'Notification tray, mark read, single & bulk operations.',
  'Push Notifications': 'Register and unregister APNS device tokens.',
  'Exports': 'CSV exports of messages, lists, list rows, and follows. Session cookie required.',
  'GitHub': 'Connected-account GitHub issue and repo helpers.',
  'LinkedIn': 'Personal LinkedIn posting targets and OAuth. Session cookie required.',
  'Utility': 'Geolocation, weather, image proxy, analytics, OAuth metadata, status probes.',
  'Billing': 'Stripe checkout and customer portal sessions.',
  'Admin': 'Admin-only user and email-log management.',
  'Webhooks & Cron': 'Internal endpoints: signature-verified webhooks and CRON_SECRET jobs. Not for general client use.',
};

// ---------------------------------------------------------------------------
// 3. Security resolution (mirrors docs/api-reference.md)
// ---------------------------------------------------------------------------
function isPublic(method, p) {
  if (/^\/api\/auth\/(login|register|logout|sync-token|forgot-password|reset-password|verify-email|verify-email-change)$/.test(p)) return true;
  if (/^\/api\/auth\/.+\/(callback|authorize)$/.test(p)) return true; // OAuth browser redirects
  if (p === '/api/oauth/client-metadata') return true;
  if (method === 'get' && (p === '/api/messages' || p === '/api/messages/{id}' || p === '/api/messages/{id}/replies')) return true;
  if (p.startsWith('/api/users/')) return true; // public by-username reads
  if (['/api/location', '/api/weather', '/api/images/proxy', '/api/test-db'].includes(p)) return true;
  if (method === 'post' && p === '/api/analytics/ingest') return true;
  if (p.startsWith('/api/webhooks/')) return true;
  if (method === 'get' && p === '/api/follow/{userId}/counts') return true;
  return false;
}
function isCookieOnly(method, p) {
  if (/^\/api\/auth\/(accounts|switch|remove-account|send-verification-email)$/.test(p)) return true;
  if (/^\/api\/auth\/(linkedin|twitter)\/status$/.test(p)) return true;
  if (/^\/api\/auth\/linkedin\/org-(authorize|callback)$/.test(p)) return true;
  if (p.startsWith('/api/exports/')) return true;
  if (p.startsWith('/api/user/identities')) return true;
  if (p === '/api/user/organizations') return true;
  if (p.startsWith('/api/linkedin/')) return true;
  if (p.startsWith('/api/organizations')) return true;
  if (p === '/api/messages/{id}/dig') return true;
  if (method === 'patch' && p === '/api/messages/{id}') return true;
  if (p.startsWith('/api/architecture-aggregates')) return true;
  return false;
}
/** Returns the per-operation `security` value, or undefined to inherit the global default. */
function resolveSecurity(method, p) {
  if (isPublic(method, p)) return [];
  if (p.startsWith('/api/cron/')) return []; // protected by CRON_SECRET, described separately
  if (isCookieOnly(method, p)) return [{ cookieAuth: [] }];
  return undefined;
}

// ---------------------------------------------------------------------------
// 4. Enrichment from docs/api-reference.md (best-effort, JSON examples only)
// ---------------------------------------------------------------------------
function inferSchema(v) {
  if (v === null) return {};
  if (Array.isArray(v)) return { type: 'array', items: v.length ? inferSchema(v[0]) : {} };
  switch (typeof v) {
    case 'string': return { type: 'string' };
    case 'boolean': return { type: 'boolean' };
    case 'number': return { type: Number.isInteger(v) ? 'integer' : 'number' };
    case 'object': {
      const properties = {};
      for (const k of Object.keys(v)) properties[k] = inferSchema(v[k]);
      return { type: 'object', properties };
    }
    default: return {};
  }
}

/** From `lines[startIdx..]`, return the contents of the next ```json fenced block. */
function nextJsonBlock(lines, startIdx) {
  for (let i = startIdx; i < lines.length; i++) {
    if (/^\s*```json\s*$/.test(lines[i])) {
      const body = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\s*```\s*$/.test(lines[j])) return { text: body.join('\n'), end: j };
        body.push(lines[j]);
      }
      return null;
    }
    if (/^###?\s/.test(lines[i])) return null; // ran into the next section
  }
  return null;
}

function buildReferenceMap() {
  const map = {};
  if (!fs.existsSync(REFERENCE_MD)) return map;
  const lines = fs.readFileSync(REFERENCE_MD, 'utf8').split('\n');
  const headingRe = /^###\s+(GET|POST|PUT|PATCH|DELETE)\s+(\/\S+)/;

  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(headingRe);
    if (!h) continue;
    const method = h[1].toLowerCase();
    const p = h[2].replace(/:([A-Za-z0-9_]+)/g, '{$1}'); // :id -> {id}
    // Section spans until the next ### / ## heading.
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^###?\s/.test(lines[j])) { end = j; break; }
    }
    const section = lines.slice(i, end);
    const entry = { mentionsPaging: /\blimit\b/i.test(section.join(' ')) && /\boffset\b/i.test(section.join(' ')) };

    // Prose description (used as a summary fallback when the handler has no JSDoc).
    const descLine = section.find((l) => /\*\*description:?\*\*/i.test(l));
    if (descLine) {
      const d = descLine.replace(/.*\*\*description:?\*\*/i, '').replace(/[*_`]/g, '').trim();
      if (d) entry.description = d;
    }

    // Request body: first json block after a "request body" marker.
    const reqIdx = section.findIndex((l) => /request body/i.test(l));
    if (reqIdx !== -1) {
      const blk = nextJsonBlock(section, reqIdx);
      if (blk) { try { entry.requestExample = JSON.parse(blk.text); } catch { /* skip */ } }
    }
    // Response: first json block after a "response" marker; capture its status code.
    const respIdx = section.findIndex((l) => /\*\*response/i.test(l) || /^response\b/i.test(l));
    if (respIdx !== -1) {
      const status = (section[respIdx].match(/\b([1-5]\d\d)\b/) || [])[1];
      const blk = nextJsonBlock(section, respIdx);
      if (blk) {
        try { entry.responseExample = JSON.parse(blk.text); entry.responseStatus = status; } catch { /* skip */ }
      } else if (status) {
        entry.responseStatus = status;
      }
    }
    map[`${method} ${p}`] = entry;
  }
  return map;
}

// ---------------------------------------------------------------------------
// 5. Assemble the spec
// ---------------------------------------------------------------------------
function operationId(method, p) {
  const parts = p
    .replace(/^\/api\//, '')
    .split('/')
    .filter(Boolean)
    .map((seg) => {
      const param = seg.match(/^\{(.+)\}$/);
      if (param) return 'By' + param[1].charAt(0).toUpperCase() + param[1].slice(1);
      return seg.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').map((w, i) =>
        i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('');
    });
  return method + parts.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function pathParameters(p) {
  return [...p.matchAll(/\{([^}]+)\}/g)].map((m) => ({
    name: m[1],
    in: 'path',
    required: true,
    schema: { type: m[1] === 'number' ? 'integer' : 'string' },
  }));
}

function build() {
  const refMap = buildReferenceMap();
  const routeFiles = walkRouteFiles(API_DIR).sort();
  const paths = {};
  const usedTags = new Set();
  const seenOpIds = new Set();
  let opCount = 0;

  for (const file of routeFiles) {
    const apiPath = fileToApiPath(file);
    const content = fs.readFileSync(file, 'utf8');
    const methods = detectMethods(content);
    if (!methods.length) continue;

    for (const method of methods) {
      const tag = resolveTag(apiPath);
      usedTags.add(tag);
      const enrich = refMap[`${method} ${apiPath}`] || {};

      let opId = operationId(method, apiPath);
      while (seenOpIds.has(opId)) opId += 'Alt';
      seenOpIds.add(opId);

      const op = {
        tags: [tag],
        summary: summaryFor(content, method) || (enrich.description && shorten(enrich.description)) || `${method.toUpperCase()} ${apiPath}`,
        operationId: opId,
      };

      if (apiPath.startsWith('/api/cron/')) {
        op.description = 'Internal job protected by CRON_SECRET (Bearer). Not for general client use.';
      } else if (apiPath.startsWith('/api/webhooks/')) {
        op.description = 'Signature-verified webhook. Not callable directly by clients.';
      }

      // Parameters (path + paging when the reference mentions it).
      const params = pathParameters(apiPath);
      if (method === 'get' && enrich.mentionsPaging) {
        params.push({ $ref: '#/components/parameters/limit' }, { $ref: '#/components/parameters/offset' });
      }
      if (params.length) op.parameters = params;

      // Request body from the reference example (write methods only).
      if (['post', 'put', 'patch'].includes(method) && enrich.requestExample !== undefined) {
        op.requestBody = {
          required: true,
          content: { 'application/json': { schema: { ...inferSchema(enrich.requestExample), example: enrich.requestExample } } },
        };
      }

      // Security override.
      const security = resolveSecurity(method, apiPath);
      if (security !== undefined) op.security = security;
      const requiresAuth = !(Array.isArray(security) && security.length === 0);

      // Responses.
      const successCode = enrich.responseStatus || (method === 'post' ? '201' : '200');
      const success = { description: 'Successful response.' };
      if (enrich.responseExample !== undefined) {
        success.content = { 'application/json': { schema: { ...inferSchema(enrich.responseExample), example: enrich.responseExample } } };
      }
      op.responses = { [successCode]: success };
      if (['post', 'put', 'patch'].includes(method)) op.responses['400'] = { $ref: '#/components/responses/BadRequest' };
      if (requiresAuth) op.responses['401'] = { $ref: '#/components/responses/Unauthorized' };
      if (method === 'post' && ['/api/messages', '/api/lists', '/api/documents'].includes(apiPath)) {
        op.responses['403'] = { $ref: '#/components/responses/Forbidden' };
      }
      if (/\{[^}]+\}/.test(apiPath)) op.responses['404'] = { $ref: '#/components/responses/NotFound' };

      paths[apiPath] = paths[apiPath] || {};
      // Stable method ordering.
      const ordered = {};
      if (paths[apiPath].parameters) ordered.parameters = paths[apiPath].parameters;
      for (const mm of METHODS) {
        if (mm === method) ordered[mm] = op;
        else if (paths[apiPath][mm]) ordered[mm] = paths[apiPath][mm];
      }
      paths[apiPath] = ordered;
      opCount++;
    }
  }

  // Sort paths alphabetically for stable diffs.
  const sortedPaths = {};
  for (const k of Object.keys(paths).sort()) sortedPaths[k] = paths[k];

  const tags = TAG_ORDER.filter((t) => usedTags.has(t)).map((name) => ({
    name,
    description: TAG_DESCRIPTIONS[name],
  }));
  // Any tag not in the curated order still gets listed.
  for (const t of [...usedTags].sort()) {
    if (!TAG_ORDER.includes(t)) tags.push({ name: t });
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'InterlinedList API',
      version: pkg.version,
      description:
        'HTTP API for InterlinedList. Generated deterministically from the route tree under app/api/ and enriched from docs/api-reference.md by scripts/generate-openapi.js (`npm run docs:openapi`). Served at /api/openapi.json and rendered at /api-docs.\n\nMost endpoints accept either a session cookie (`interlinedlist-session`) or a Bearer sync token from POST /api/auth/sync-token. A subset (auth account management, exports, identities, organizations, LinkedIn, message dig, architecture aggregates) requires the session cookie.',
    },
    servers: [
      { url: 'https://interlinedlist.com', description: 'Production' },
      { url: 'http://localhost:3000', description: 'Local development' },
    ],
    tags,
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    paths: sortedPaths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Sync token from POST /api/auth/sync-token, sent as `Authorization: Bearer <token>`.',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'interlinedlist-session',
          description: 'Session cookie set by POST /api/auth/login.',
        },
      },
      parameters: {
        limit: { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 50 }, description: 'Page size.' },
        offset: { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 }, description: 'Items to skip.' },
      },
      responses: {
        BadRequest: { description: 'Bad request — invalid or missing parameters.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Unauthorized: { description: 'Not authenticated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Forbidden: { description: 'Forbidden — email not verified or subscriber feature.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        NotFound: { description: 'Resource not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
      schemas: {
        Error: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'], example: { error: 'Not authenticated' } },
        Pagination: { type: 'object', properties: { total: { type: 'integer' }, limit: { type: 'integer' }, offset: { type: 'integer' }, hasMore: { type: 'boolean' } } },
      },
    },
    _meta: { paths: Object.keys(sortedPaths).length, operations: opCount },
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
(function main() {
  const spec = build();
  const meta = spec._meta;
  delete spec._meta;

  // Self-validate before writing.
  const json = JSON.stringify(spec, null, 2);
  JSON.parse(json); // throws on malformed output
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, json + '\n', 'utf8');

  console.log(`✓ Wrote docs/openapi.json — ${meta.paths} paths, ${meta.operations} operations.`);
})();
