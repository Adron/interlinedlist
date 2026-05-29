---
title: Troubleshooting Vercel Deployments When Things Break in Production
date: 2026-05-29
excerpt: Logs are there. You just have to know where Vercel put them and how to read what they're actually telling you.
---

The Bluesky cross-posting stopped working. No error surfaced to the user. The post went through the UI, the confirmation came back, and nothing appeared on Bluesky. Everything looked fine until you checked the other end.

That's the worst kind of failure. Silent, confident, wrong.

I'd been here before with other integrations. The debugging process on Vercel is not obvious the first time, and it's easy to waste an hour looking in the wrong place. This is what I actually did, in order, to find and fix the problem.

---

## Where the Logs Actually Are

Vercel has two distinct log surfaces, and they cover different failure modes. Confusing them costs time.

**Build logs** are what you see during deployment. If your build fails — TypeScript errors, missing dependencies, bad environment references at build time — the build log is where the failure shows up. You get to it through the project's **Deployments** tab. Click any deployment, and the build output is right there.

**Runtime logs** are what you want when the build succeeded but something breaks during a live request. These live under the **Logs** tab in your project. Not the deployment. The project itself, top-level navigation.

The Logs tab shows function invocations in near real time. Each row is one invocation: the function path, the timestamp, the HTTP method and response status, and the duration. Click a row and you get the full log output for that invocation — everything your function wrote to `console.log`, `console.error`, the request details, memory usage.

For the Bluesky issue, the relevant function was the cross-post API route. I filtered by function path using the filter bar at the top of the Logs tab — it accepts partial path matches — and narrowed the time range to when the failed post was submitted. The invocation was right there. Status 200. And in the body: a network timeout attempting to reach `bsky.social`.

---

## Build Logs vs. Runtime Logs — Why It Matters

Build logs tell you the code got deployed. Runtime logs tell you what the code actually did.

A 200 status on a build means nothing about runtime behavior. I've shipped builds that deployed cleanly and immediately 500'd in production because an environment variable wasn't set, or set to the wrong value. The build succeeds because the environment variable is only read at runtime — not at build time — so the build has no idea anything is wrong.

If you're chasing a production failure and the build is green, stop looking at the build log. Open the Logs tab.

---

## Environment Variables Are the Silent Killer

Most production failures I've debugged on Vercel come down to environment variables. Either they're not set, they're set to a stale value, or they're set for the wrong environment.

Vercel environments are: **Development**, **Preview**, and **Production**. When you add an environment variable in the Vercel dashboard under **Settings → Environment Variables**, you choose which environments it applies to. It's easy to set something for Preview and forget to toggle Production. Then your preview deployments work and your production deployments don't, and you spend twenty minutes convinced there's a code bug.

For the Bluesky issue, the AT Protocol integration needs two things: a handle and an app password. App passwords on Bluesky are generated in account settings — they're not your main password, and they expire or get invalidated if you regenerate them. The environment variable in Vercel was stale. It had an old app password that was no longer valid. Bluesky returned a 401. The code caught the error but didn't surface it clearly to the user, so the post appeared to succeed from the UI's perspective.

The fix was straightforward: generate a new app password in Bluesky settings, update the variable in Vercel under Production, redeploy.

---

## Reading a Bluesky Failure in the Logs

The AT Protocol API is reasonably well-behaved about errors, but what you see in Vercel logs depends on how your code handles the response.

Three distinct failure modes I've seen:

**401 Unauthorized.** The credentials are wrong or expired. The response comes back quickly. If your code doesn't log the response body, you might only see the status code — which is enough to know it's a credentials issue, not a network one.

**Network timeout.** The request to `bsky.social` hangs and eventually times out. Vercel functions have a maximum execution duration (10 seconds on the Hobby plan, 60 seconds on Pro). If the AT Protocol call times out at the network level, your function may not finish cleanly. You'll see a long duration on the invocation and often a 504 or a function timeout error in the logs.

**Silent 200 from a queued or no-op operation.** This is the subtle one. Some operations in the AT Protocol return 200 with a valid-looking response even when the operation didn't fully commit. If your code only checks the HTTP status and not the response body — specifically whether the `uri` and `cid` fields are present and populated in the response — you can get a false success.

The way to tell these apart: log the full response body from the AT Protocol call, not just the status. One line of logging would have saved me the first twenty minutes of this investigation.

```typescript
const response = await agent.post({ text: content });
console.log('Bluesky post result:', JSON.stringify(response));
```

That's it. If `response.uri` is undefined, something went wrong regardless of what the HTTP status says.

---

## The "Expected Non-Null Body Source" Error

This one was harder to track down. Cross-posting was silently failing — the user saw a success, nothing appeared on Bluesky — and the error that eventually surfaced in the logs was: `expected non-null body source`. No indication of which library threw it, no indication of what the body was supposed to be.

The stack trace made it readable:

```
[postToBluesky] error: Error: expected non-null body source
    at n.from (/var/task/.next/server/chunks/6490.js:1:183096)
    at d.<anonymous> (/var/task/.next/server/chunks/6490.js:3:428)
    at async d.dpopFetch (/var/task/.next/server/chunks/6490.js:4:284531)
    at async d.fetchHandler (/var/task/.next/server/chunks/6490.js:4:310523)
    at async n (/var/task/.next/server/chunks/2100.js:1:2472)
```

`dpopFetch` is inside `@atproto/oauth-client-node`, the library that handles OAuth authentication for the AT Protocol. DPoP — Demonstrating Proof of Possession — is part of how the AT Protocol proves that a token is being used by the party it was issued to. The library generates and attaches the proof header automatically on every authenticated request.

Here is where serverless breaks it. Bluesky's server requires a DPoP nonce on each request. On a cold start, there is no stored nonce. The library makes the first request without one, gets back a `use-dpop-nonce` response with the correct nonce, and then needs to retry the same request using that nonce.

To retry, it needs to replay the request body.

The problem: the library built a `Request` object from the original `RequestInit` when making the first attempt. That `Request`'s `.body` property becomes a `ReadableStream`. Making the first request consumes the stream. When the library attempts to extract the body for the retry — `n.from(request.body)` — the stream is already consumed. Node.js throws "expected non-null body source."

This is a bug in the library. The correct behavior is to store the original `BodyInit` separately and use it to construct a fresh body for the retry, rather than attempting to re-read the consumed stream from the `Request` object.

**What changed in the code while investigating:**

Three call sites were sending body formats that are particularly bad for this scenario. The delete path was still using a raw `JSON.stringify` string. The image upload path was using a `Uint8Array`. Both were updated to `Blob` with an explicit MIME type, which is the correct input format regardless of the retry behavior:

```typescript
// Before
body: JSON.stringify(bodyObj)
body: new Uint8Array(arrayBuffer)

// After
body: new Blob([JSON.stringify(bodyObj)], { type: 'application/json' })
body: new Blob([arrayBuffer], { type: mimeType })
```

This covered three call sites: `createRecord` for post creation, `deleteRecord` for deleting posts, and `uploadBlob` for image attachments. The delete and image upload paths had been missed in an earlier pass that fixed `createRecord`.

**The actual fix: upgrade the library.**

The project was pinned to `@atproto/oauth-client-node` 0.3.16. Version 0.4.0 was released May 19, 2026. Version 0.4.1 followed on May 26. The DPoP body replay behavior was corrected in the 0.4.x line. The `Blob` body changes are still correct defensive practice, but the library upgrade is what resolves the error at its root.

```bash
npm install @atproto/oauth-client-node@0.4.1
```

Update `package.json` to `"^0.4.1"` and commit the lockfile. The upgrade brought in 26 package changes and introduced no breaking changes against the existing code — TypeScript compiled clean against the new version without modification.

One other log line appears alongside this error and is worth noting: `No lock mechanism provided. Credentials might get revoked.` This is unrelated. It is the library warning that there is no distributed lock for concurrent token refresh, which is expected on serverless. It is not the error, and it does not cause the error.

The lesson here: when the stack trace puts you inside a third-party library's authentication layer, check the library version before writing workarounds. The bug was in the library. The fix was in the library. The code changes we made along the way were correct, but they were not what stopped the failure.

---

## Vercel's Network Context

Vercel functions run in AWS Lambda. The outbound IP address is not fixed — it can change per invocation, per region, per deployment. If you're integrating with any API that does IP allowlisting, Vercel's serverless functions will not work cleanly without an additional layer (a fixed-IP proxy, Vercel's own IP ranges if they publish them, or routing through a dedicated egress).

Bluesky doesn't IP-restrict, so this wasn't a factor for the cross-posting issue. But it's worth knowing, because the next integration might.

More relevant for modern Vercel apps: the distinction between the **Edge Runtime** and the **Node.js Runtime**.

Edge functions run at Vercel's edge network, closer to users, with lower cold-start latency. The tradeoff is a restricted runtime — the Edge Runtime is not Node.js. It uses the WinterTC Web Standards API subset. `node:https`, `node:fs`, `node:crypto` (partially) — a lot of Node built-ins either don't exist or behave differently. The AT Protocol SDK (`@atproto/api`) requires a standard `fetch` implementation, which the Edge Runtime does provide. But if you're using any Node-specific HTTP library for your outbound calls, and that route runs in Edge, you'll get a runtime error that looks like a missing module.

The fix is explicit: add `export const runtime = 'nodejs'` at the top of any API route that needs the full Node.js environment.

```typescript
export const runtime = 'nodejs';
```

If you're not sure which runtime your route is using, check the function invocation in the Logs tab — the runtime is displayed in the invocation metadata.

---

## Why It Works Locally and Breaks on Vercel

The most frustrating debugging scenario: it runs fine locally, fails in production. Usually one of four things.

**Environment variable mismatch.** Your local `.env.local` has values that aren't in Vercel, or has stale values you haven't updated. The code path that's broken in production never gets exercised locally because local uses different (working) credentials.

**Node version mismatch.** Vercel uses a specific Node version per project, configured under **Settings → General → Node.js Version**. If your local version is newer, you might be using a language feature or built-in behavior that the Vercel Node version doesn't support.

**Missing native binaries.** Some npm packages require native compilation (`bcrypt`, `sharp`, certain database drivers). These compile against the local OS. On Vercel, they need to compile against Amazon Linux. Most packages handle this now, but if you're adding a new dependency that includes native bindings, a local install and a Vercel build can produce different artifacts.

**Network latency to the external API.** Locally you might be hitting a fast path to the external service. Vercel functions run in a specific AWS region (configurable under project settings). If the external API has regional endpoints, your function's latency profile can be completely different — and if there are timeouts in your code that are calibrated for local performance, they can fire in production when they wouldn't locally.

The fastest way to close the environment gap: `vercel env pull`. Run it in your project directory and it pulls all your Vercel environment variables into a local `.env.local` file (it won't overwrite existing values; it adds missing ones). Then restart your dev server. If the problem reproduces locally after that, you're debugging the right thing.

```bash
vercel env pull
```

You need the Vercel CLI installed and authenticated (`npm i -g vercel`, then `vercel login`). If you haven't set up the CLI yet, this is worth doing before you need it during an incident.

---

## The Troubleshooting Sequence

When something breaks in a Vercel-deployed integration, this is the order I go through:

1. **Check the Logs tab, not the Deployments tab.** Filter by the relevant function path and the time range when the failure occurred. Find the invocation.

2. **Read the full invocation log.** Status code, duration, and any console output from your function. If duration is close to the function timeout limit, suspect a network hang. If status is 401 or 403, suspect credentials.

3. **Check environment variables.** Go to **Settings → Environment Variables** in the Vercel dashboard. Verify the variable exists, has the right value, and is enabled for the Production environment specifically.

4. **Run `vercel env pull` locally.** Get your local environment to match production. Reproduce the failure locally if possible — it's much faster to debug locally than through the Vercel Logs tab.

5. **Check the Node.js runtime version.** Under **Settings → General**. Compare to your local version. If there's a mismatch and your code uses anything version-dependent, this is a candidate.

6. **Check which runtime the function uses.** Edge or Node.js. If it's Edge and your code imports anything Node-specific, that's the problem.

7. **Add logging to the external API call.** Log the full request and response, not just the status. Status codes lie. Response bodies tell the truth.

8. **If the external API is returning errors**: distinguish between credentials issues (4xx, fast response), rate limits (429 with a retry-after header), and network issues (timeout, no response). Each one has a different fix.

9. **If the stack trace points inside a third-party authentication library**, check the library version before writing workarounds. Authentication libraries — especially ones that implement OAuth, DPoP, or token refresh — have subtle serverless edge cases that get fixed in patch and minor releases. The `@atproto/oauth-client-node` DPoP body replay bug is a concrete example: the stack trace was entirely inside the library, the error looked like a body format problem, and the real fix was a version upgrade. Check for updates, read the changelog, upgrade if a newer version addresses the failure mode you're seeing.

10. **Consider Log Drains for ongoing observability.** Vercel's built-in Logs tab only retains logs for a limited window — one hour on Hobby, longer on Pro. If you need logs to persist and be searchable, set up a Log Drain under **Settings → Log Drains** to ship to Datadog, Axiom, Papertrail, or any HTTPS endpoint. Do this before the next incident, not during it.

The Bluesky issue took about 40 minutes to diagnose and fix. Thirty of those were spent in the wrong place before I found the runtime logs. Now that I know the path, the same class of problem would take five minutes.

The logs were there the whole time. Vercel just doesn't put them where you'd expect.

---

*— Adron*
