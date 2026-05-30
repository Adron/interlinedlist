---
title: Cross-Platform Syndication
---

# Cross-Platform Syndication

When you post a message on InterlinedList you can optionally send a copy to one or more external social platforms at the same time. This is called **cross-posting** (or syndication). The post originates on InterlinedList; the platforms receive a copy.

---

## What the feed labels mean

When you browse the Home feed you may notice small platform labels on some posts — **Mastodon**, **Bluesky**, or **LinkedIn**. These labels indicate that the author chose to syndicate that message to that platform when they posted it. The post lives on InterlinedList first; the label is a record of where else it was sent.

You do not need accounts on those platforms to read labeled posts on InterlinedList. The label is informational only.

---

## Supported platforms

| Platform | Notes |
|----------|-------|
| **Mastodon** | Decentralized; you can connect one or more Mastodon accounts from different instances. When cross-posting you choose which connected instance(s) to send to. |
| **Bluesky** | One linked account; the post is sent automatically when you enable it for a message. |
| **LinkedIn** | One linked account; availability depends on whether your InterlinedList instance has LinkedIn OAuth configured. |

---

## Requirements

- **Subscriber account** — Cross-posting is a subscriber-only feature. Your subscription tier is shown in Settings.
- **Connected account** — You must link each platform you want to post to. Go to **Settings → Security → Connected Accounts** and link the relevant platforms before composing.

---

## Setting up

1. Go to **Settings → Security** (or the Connected Accounts section on the Settings page).
2. Click **Connect** next to the platform you want to link:
   - **Mastodon** — You will be prompted for your Mastodon instance hostname (e.g. `mastodon.social`), then redirected to authorize.
   - **Bluesky** — You will be redirected through Bluesky's OAuth flow.
   - **LinkedIn** — You will be redirected through LinkedIn's OAuth flow (only available if LinkedIn is enabled on this instance).
3. After authorizing, the account appears as connected. You can link additional Mastodon accounts from different instances by repeating the process with a different instance hostname.

To unlink a platform, find it in Connected Accounts and click **Disconnect**.

---

## Cross-posting when you compose

1. Open the message input on the Home page.
2. Enable **Advanced post settings** — either via Settings → Message Settings, or by clicking the gear icon next to the input if it is already visible.
3. In the advanced options panel, find the **Cross-post** section.
4. Toggle the platforms you want to receive the post. For Mastodon, you can select which of your connected instances to send to.
5. Post as normal. The message publishes on InterlinedList, then cross-posting runs in the background.

You choose cross-posting targets per message, so you can syndicate some posts and not others.

---

## What happens on the other platform

The post appears as a native post from your account on that platform. It is not a link card — it is a full post with your message content. The length and formatting are subject to each platform's limits; very long messages may be truncated or rejected depending on the platform's rules.

If your message includes a URL, it appears in the cross-posted content. Images and videos attached to your InterlinedList message are not automatically forwarded in the current version.

---

## What does not cross-post

- **Replies** — Replies to messages are not cross-posted, even if cross-posting is enabled in your settings.
- **Plain reposts (push without comment)** — A plain repost of another user's message does not cross-post.
- **Reposts with comment** — Also not cross-posted.
- **Scheduled posts** — The cross-posting runs at the scheduled publication time, not when you save the draft. Cross-post targets are stored with the draft and sent when the scheduler publishes the message.

---

## Replies to cross-posted messages

When you reply to a message that was originally cross-posted and you follow the original author on the same external platform, your reply may be sent to that platform automatically. This behaviour is platform-dependent and is not guaranteed. If automatic cross-posting of a reply fails, a brief error toast appears for five seconds; your reply still appears on InterlinedList.

---

## If cross-posting fails

A failed syndication does not prevent the message from being published on InterlinedList. If one platform fails, the others still receive the post. The response from `POST /api/messages` includes a `crossPostResults` array that reports success or failure per platform — useful if you are building on the API. In the web app, failures surface as a short error toast.

Common causes of failure:

- The linked account's OAuth token has expired — reconnect the account in Settings → Security.
- The message exceeds the target platform's character limit.
- The platform's API is temporarily unavailable.

---

## Managing connected accounts

Go to **Settings → Security → Connected Accounts** at any time to:

- See which accounts are linked and which Mastodon instances you have connected
- Add a new Mastodon instance
- Disconnect any account you no longer want to use for cross-posting

Disconnecting an account does not delete posts already cross-posted to that platform.
