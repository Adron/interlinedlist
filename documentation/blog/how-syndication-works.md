---
title: How InterlinedList Connects to Mastodon, Bluesky, and LinkedIn
date: 2026-05-18
excerpt: Most cross-posting tools push the same text everywhere and call it done. Here's why that doesn't work — and what InterlinedList does instead.
---

Foundational series, post 5 of 5.

---

When you publish an entry on InterlinedList, you're not just posting to one platform.

You're publishing to a feed that connects to three others — and what makes that worth explaining isn't the mechanics of OAuth connections. It's what actually happens to your content on each platform, and why it's different from copying and pasting the same text everywhere.

---

## The Cross-Posting Problem

Anyone who maintains a presence across multiple platforms has run into this: you write something, post it on one platform, then spend ten or twenty minutes manually adapting it for the others.

Bluesky has a 300-character limit. LinkedIn works better with a hook and a professional tone. Mastodon's culture rewards longer, thread-formatted posts with hashtags in the footer rather than inline. What lands on one platform often doesn't translate directly to another.

Most cross-posting tools ignore this entirely. They take your text and post it identically everywhere. The result is content that doesn't fit the norms of any of the platforms it lands on — too long for Bluesky, not formatted as a thread for Mastodon, too casual for LinkedIn.

InterlinedList takes a different approach. When you publish and select platforms to syndicate to, the syndication layer generates a platform-specific adaptation for each — and shows you the result before anything goes out.

---

## What Happens on Each Platform

### InterlinedList Feed

Your feed gets the full entry, exactly as written. Full Markdown rendering, complete length, all formatting intact. This is the canonical version — the source of truth that every other platform adaptation links back to.

### Mastodon

Mastodon has strong norms around threading, hashtags, and content warnings. InterlinedList adapts for this:

- Short entries (under ~400 characters) post as a single toot
- Long entries become a thread — the first toot contains the opening paragraph and a thread indicator, each subsequent toot carries the next section, the final toot links back to the full entry on InterlinedList
- Tags from the entry become Mastodon hashtags appended to the final toot in the thread (Mastodon convention is hashtags in the footer, not inline)
- The thread is linked as a native Mastodon thread, not multiple separate posts

### Bluesky

Bluesky's character limit and card-preview system work differently from Mastodon's thread model:

- A condensed summary card is generated from the first paragraph of the entry plus the title
- The card links back to the full entry on InterlinedList
- If the entry has an attached image, the card uses it as the preview image
- For short entries that fit within Bluesky's limits, the full text is used instead of a summary

The link preview card is how most Bluesky content spreads — a compelling card with a clear link performs better than a truncated post. The syndication layer generates the card automatically, but you can edit the summary text before anything goes out.

### LinkedIn

LinkedIn has the most different norms of the three. InterlinedList adapts accordingly:

- A professional framing is generated — leading with a hook sentence designed for LinkedIn's feed algorithm, followed by the key point from the entry, closing with a link to the full entry
- Formatting is adapted from Markdown conventions to LinkedIn's plain-text norms
- Tone is adjusted toward professional without removing the voice of the original entry — this is a suggestion, not an override; you review and edit before it goes out
- Hashtags are included at the end (standard LinkedIn convention for discoverability)

---

## What You Control

Every adaptation is shown to you in the publish dialog before anything goes out. You can:

- Edit any adaptation — click into the preview for any platform and change the text, the hashtags, the hook sentence, whatever needs adjusting
- Skip platforms per-entry — uncheck any platform for a given entry; not everything belongs on LinkedIn, not every short observation needs a Mastodon thread
- Preview rendering — the Mastodon thread view shows the thread as it will appear, including toot count and thread link

Nothing syndicates without your explicit selection in the publish dialog. Every publish action requires you to review and confirm the platform destinations.

---

## How Syndication Fits the Three Roles

Syndication is a creator feature — distribution, reach, consistent presence across platforms without duplicating effort.

But it connects to the other two roles in ways that are easy to miss.

For the collector: your InterlinedList feed is where content lives permanently. When you link to something you published from a Mastodon post or a Bluesky card, the link goes back to your InterlinedList entry — where the full piece is, where its linked entries are, where its series context is. The feed is the stable, permanent home that your syndicated posts on other platforms point back to.

For the writer: knowing a finished entry will go to four platforms simultaneously changes how you draft. You're not writing for a tweet or a LinkedIn post. You're writing a proper piece that will be adapted for those platforms. Writing first, platform-adapting second — that framing produces better writing than writing for the platform directly.

---

## Source/Published Sync Across Platforms

After syndication, each platform is tracked in the entry's sync state. The Dashboard shows:

- InterlinedList feed: in sync, drifted, or untracked
- Mastodon, Bluesky, LinkedIn: syndicated on [date]

If you edit the source entry after syndication, the Dashboard shows the entry as Drifted and notes which platforms received the earlier version. You can then decide whether to republish to the feed and re-syndicate the updated version, leave the external posts as-is, or post a follow-up entry noting the change.

Re-syndication is always an explicit action. Nothing goes out to external platforms automatically on an edit.

---

## Setting It Up

Connecting platforms takes about five minutes total:

- Mastodon: Settings → Syndication → Mastodon → enter your instance URL → OAuth authorize
- Bluesky: Settings → Syndication → Bluesky → enter your handle → App Password
- LinkedIn: Settings → Syndication → LinkedIn → OAuth authorize

Once connected, each platform is available as a syndication option in every future publish dialog.

---

That's the full picture of how syndication works — and the end of the Foundational series.

If you've read all five posts in order, you now know what "interlined" means, why the feed exists in a writing tool, what is free, what a session looks like, and how distribution works.

The next series covers individual features in depth. Start wherever the feature most relevant to where you are right now: the Dashboard, the Editor, Lists, Syndication, or Markdown Export.

*— [Adron](https://interlinedlist.com/adron)*
