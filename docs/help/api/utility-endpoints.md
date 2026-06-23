---
title: Utility Endpoints
---

# Utility Endpoints

A small group of utility routes used by the web app and supporting services. Most are public (no auth) and intended for narrow use cases.

## Endpoint table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/location` | Public | Resolve latitude/longitude to a US city, state, and timezone via NOAA. |
| GET | `/api/weather` | Public | US weather data from NOAA for a given lat/lon. Optional hourly and weekly series. |
| GET | `/api/images/proxy` | Public | Server-side image proxy for Instagram CDN images (CORS workaround). |
| POST | `/api/analytics/ingest` | Session optional | First-party page-view and action beacon used by the web app. |
| GET | `/api/oauth/client-metadata` | Public | Bluesky AT Protocol relying-party client metadata. Not for direct calls. |
| GET | `/api/auth/linkedin/status` | Public | Whether LinkedIn OAuth is configured on this deployment. |
| GET | `/api/auth/twitter/status` | Public | Whether X (Twitter) OAuth is configured on this deployment. |
| GET | `/api/test-db` | Public | Dev diagnostic that asserts the database is reachable. **Do not depend on this in production.** |

## Geolocation

```http
GET /api/location?latitude=47.6&longitude=-122.3
```

```json
{
  "city": "Seattle",
  "state": "WA",
  "country": "United States",
  "coordinates": { "latitude": 47.6, "longitude": -122.3 },
  "timezone": "America/Los_Angeles"
}
```

US coordinates only.

## Weather

```http
GET /api/weather?latitude=47.6&longitude=-122.3&extended=true
```

| Query | Default | Notes |
|-------|---------|-------|
| `latitude`, `longitude` | required | |
| `extended` | `false` | Include `hourly` and `weekly` series. |
| `refresh` | `false` | Bypass the server-side LRU cache (30 min per gridpoint). |

```json
{
  "location": "Seattle",
  "temperature": 62,
  "condition": "Partly Sunny",
  "conditionIcon": "bx-cloud",
  "high": 68, "low": 54,
  "humidity": 71,
  "windSpeed": 5,
  "timeZone": "America/Los_Angeles",
  "hourly": [ { "startTime": "...", "temperature": 62, "probabilityOfPrecipitation": 0, "shortForecast": "Partly Sunny" } ],
  "weekly": [ { "name": "Tonight", "isDaytime": false, "temperature": 54, "shortForecast": "Mostly Cloudy", "icon": "..." } ]
}
```

## Image proxy

```http
GET /api/images/proxy?url=https://instagram.com/p/abc.jpg
```

Streams the bytes back with appropriate caching. **On any failure** (timeout, non-image content type, oversized response, network error) it responds with a placeholder SVG and the header `X-Image-Status: placeholder` — it does **not** return 4xx/5xx for image fetch failures.

Allowed hostnames: `instagram.com`, `cdninstagram.com`, `fbcdn.net`, and subdomains. Any other domain returns `403`.

## Analytics beacon

```http
POST /api/analytics/ingest
Content-Type: application/json

{ "type": "page_view", "path": "/dashboard", "referrer": "https://google.com" }
```

For named actions:

```json
{ "type": "action", "name": "post_created", "properties": { "channel": "web" } }
```

Always returns `204 No Content`; invalid bodies are silently dropped. The server sets the `interlinedlist_analytics_session` cookie on first call (30-day lifetime by default).

## Provider configuration probes

```http
GET /api/auth/linkedin/status
GET /api/auth/twitter/status
```

Both respond with `{ "configured": boolean, "redirectUri": string | null }`. Use these to decide whether to surface a LinkedIn/X sign-in button.

## Bluesky AT Protocol metadata

`GET /api/oauth/client-metadata` returns the standard OAuth client-metadata JSON consumed by Bluesky's auth server during the OAuth handshake. The URL also serves as the `BLUESKY_CLIENT_ID`. Don't call this from your own code; it exists to make the OAuth flow work.
