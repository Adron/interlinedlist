# InterlinedList User Guide

Welcome to InterlinedList. This guide covers every feature available to you as a signed-in user, from writing your first post to connecting social accounts and managing lists.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Writing and Posting Messages](#writing-and-posting-messages)
   - [Character Limit](#character-limit)
   - [Making a Post Public or Private](#making-a-post-public-or-private)
   - [Attaching Images](#attaching-images)
   - [Attaching a Video](#attaching-a-video)
   - [Adding Tags](#adding-tags)
   - [Quoting and Pushing a Message](#quoting-and-pushing-a-message)
   - [Scheduling a Post](#scheduling-a-post)
3. [Cross-Posting to Social Networks](#cross-posting-to-social-networks)
   - [Cross-Posting to Mastodon](#cross-posting-to-mastodon)
   - [Cross-Posting to Bluesky](#cross-posting-to-bluesky)
   - [Cross-Posting to LinkedIn](#cross-posting-to-linkedin)
   - [Cross-Posting to Twitter / X](#cross-posting-to-twitter--x)
4. [Connected Accounts](#connected-accounts)
   - [GitHub](#github)
   - [Bluesky](#bluesky)
   - [LinkedIn](#linkedin)
   - [Mastodon](#mastodon)
   - [Twitter / X](#twitter--x)
5. [Scheduled Posts](#scheduled-posts)
6. [Lists](#lists)
   - [Searching Your Lists](#searching-your-lists)
   - [List Folders](#list-folders)
   - [Toggling List Visibility](#toggling-list-visibility)
7. [Documents](#documents)
   - [Creating Subfolders](#creating-subfolders)
   - [Searching Your Documents](#searching-your-documents)
   - [Moving a Document to a Different Folder](#moving-a-document-to-a-different-folder)
8. [Organizations](#organizations)
9. [Following Other Users](#following-other-users)
10. [Notifications](#notifications)
11. [Settings and Profile](#settings-and-profile)
12. [Subscriptions](#subscriptions)
13. [Exporting Your Data](#exporting-your-data)
14. [Mobile Push Notifications](#mobile-push-notifications)
15. [Branding & Style Guide](#branding--style-guide)
    - [Brand Story](#brand-story)
    - [Logo Assets](#logo-assets)
    - [Logo Usage Rules](#logo-usage-rules)
    - [Brand Colors](#brand-colors)
    - [Typography](#typography)
    - [The Darkone Theme](#the-darkone-theme)
    - [Branding Package for Partners](#branding-package-for-partners)
    - [CSS Custom Properties Reference](#css-custom-properties-reference)
    - [Dos and Donts](#dos-and-donts)

---

## Getting Started

After signing up and verifying your email address, you land on your home feed. From here you can write posts, browse content, and configure your account from the Settings page.

---

## Writing and Posting Messages

The compose box sits at the top of your feed. Type your message, adjust any options, and press **Post Message**.

### Character Limit

Every account has a maximum character limit per message. The counter below the text box shows how many characters you have remaining. The counter turns yellow when you are close to the limit and red if you go over — you cannot post until you bring the count back within the limit.

### Making a Post Public or Private

A checkbox labelled **Public** appears in the lower-right corner of the compose box. When checked, your post is visible to anyone who can see your profile. When unchecked, the post is only visible to you and your approved followers.

### Attaching Images

Images are available to subscribers with the advanced posting panel open (see [Subscriptions](#subscriptions)).

1. Click the gear icon next to the character counter to open the advanced posting panel.
2. Click the **image icon** (a small picture frame).
3. In the dialog that opens, choose one or more image files from your device. You can attach up to eight images per post.
4. Large images are automatically resized to fit within 1200 x 1200 pixels and a 1.4 MB file size limit.
5. If a photo is oriented sideways, use the **rotate clockwise** or **rotate counter-clockwise** buttons on each thumbnail to fix it before uploading.
6. Click **Upload** to save the images, then **Done** to close the dialog.

### Attaching a Video

1. Open the advanced posting panel (gear icon).
2. Click the **video icon**.
3. Select a video file from your device. Only one video per post is supported, and the file must be 3 MB or smaller.
4. Click **Upload**, then **Done**.

### Adding Tags

1. Open the advanced posting panel (gear icon).
2. A **Tags** field appears below the compose toolbar. Type a tag and press **Enter** or **,** to add it, or click **Add**.
3. Tags are stored in lowercase. Each tag appears as a badge; click the small X on a badge to remove it.

### Quoting and Pushing a Message

When you push another user's post, a blue banner appears at the top of the compose box confirming that your reply will be attached to the original. Add your own comment and press **Post Message**. Pushed posts are always public.

### Scheduling a Post

See [Scheduled Posts](#scheduled-posts) for full details.

---

## Cross-Posting to Social Networks

Once you have connected a social account (see [Connected Accounts](#connected-accounts)), the corresponding icon appears in the advanced posting panel toolbar. Click an icon to toggle cross-posting on or off for that account. When one or more cross-post destinations are selected, a summary line below the compose box confirms where the post will go.

After you submit, a brief status line shows which networks received the post and flags any that failed.

### Cross-Posting to Mastodon

If you have connected more than one Mastodon instance, a separate Mastodon icon appears for each one. Click the icon for each instance you want to include. Active instances are highlighted in blue.

### Cross-Posting to Bluesky

Click the **Bluesky icon** in the toolbar. It turns blue when active. Your post is sent to your connected Bluesky timeline at the same time it is saved on InterlinedList.

### Cross-Posting to LinkedIn

Click the **LinkedIn icon** in the toolbar. It turns blue when active.

**Choosing where the post goes on LinkedIn.** You can post as your personal LinkedIn profile, as an organization page you have been assigned to, or both. If you have more than one enabled LinkedIn destination, a **LinkedIn destinations** checkbox list appears below the toolbar — tick every destination that should receive the post. Your personal profile is selected by default (or the first available page if your personal profile is not enabled). You control which destinations are available here from the **Posting targets** list on the Connected Accounts page (see [LinkedIn](#linkedin) under Connected Accounts).

If one LinkedIn destination fails, the others still receive the post — the status line below the compose box shows a warning for any destination that did not go through.

If your message contains a URL, an extra option appears: **Post link(s) as first comment (LinkedIn)**. Checking this box places the URL in the first comment instead of in the body of the post, which can improve how LinkedIn presents the content.

### Cross-Posting to Twitter / X

Click the **Twitter / X icon** (the bird icon) in the toolbar. It turns blue when active. Your post is sent to your connected Twitter / X account at the same time it is saved on InterlinedList.

Posts longer than 280 characters are automatically split into a thread so that the full content appears on Twitter / X.

---

## Connected Accounts

Go to **Settings > Connected Accounts** to link, verify, or remove social and developer accounts.

### GitHub

Connecting GitHub lets you sign in with your GitHub credentials and sync GitHub Issues with your lists.

1. On the Connected Accounts page, find the **GitHub** card and click **Connect**.
2. Sign in to GitHub if prompted and approve the requested permissions.
3. You are returned to InterlinedList with GitHub shown as connected.

If you want deeper GitHub Issues integration (reading and writing issues directly from your lists), click **Reconnect for GitHub Issues** to grant the additional permission.

You can also set a **default GitHub repository** (in `owner/repo` format) that is used when syncing issues without specifying a repo manually.

### Bluesky

1. On the Connected Accounts page, find the **Bluesky** card.
2. Type your Bluesky handle in the text field (for example, `yourname.bsky.social`).
3. Click **Connect**.
4. Sign in to Bluesky and approve the connection.
5. You are returned to InterlinedList with Bluesky shown as connected.

### LinkedIn

1. On the Connected Accounts page, find the **LinkedIn** card and click **Connect** (the button appears when LinkedIn sign-in is available on your InterlinedList instance).
2. Sign in to LinkedIn and approve the permissions.
3. You are returned to InterlinedList with LinkedIn shown as connected.

#### Choosing your LinkedIn posting targets

Once LinkedIn is connected, a **Posting targets** list appears on the LinkedIn card. It shows every LinkedIn destination you can post as:

- Your **personal** LinkedIn identity.
- Any organization **pages** you have been assigned to — for example, a company page run by an organization you belong to. Pages only appear here after an administrator of that organization has connected the page and assigned you to it (see [Organizations](#organizations)).

Check a target to make it available when cross-posting; uncheck it to hide it from the compose box. All of your available targets are enabled by default. At least one target must always remain enabled — if you try to uncheck the last one, the change is blocked and a message reminds you that one target must stay on.

### Mastodon

You can connect as many Mastodon instances as you like, and each one will appear as a separate cross-post option in the compose toolbar.

1. On the Connected Accounts page, scroll to the **Mastodon** section.
2. Type the domain of your Mastodon instance (for example, `mastodon.social`) in the text field.
3. Click **Add Mastodon instance**.
4. Sign in to your Mastodon account on that instance and approve the connection.
5. You are returned to InterlinedList with that instance listed under Mastodon.

Repeat for each additional instance you want to connect.

### Twitter / X

See the dedicated [Twitter / X](#twitter--x-1) section below for full details on connecting, cross-posting, scheduling, disconnecting, and troubleshooting.

---

## Twitter / X

This section covers everything about the Twitter / X integration from start to finish.

### Connecting Your Twitter / X Account

Before you can cross-post to Twitter / X, you need to link your Twitter account once.

1. Click **Settings** in the navigation, then choose **Connected Accounts**.
2. Scroll to the **Twitter / X** card.
3. Click **Connect**. You are taken to Twitter / X's sign-in page.
4. Enter your Twitter / X username and password if prompted (or confirm with an existing session).
5. Twitter / X shows a permissions screen listing what InterlinedList is asking for. Review the list and click **Authorize app**.
6. You are redirected back to InterlinedList. The Twitter / X card now shows your username and a profile picture, confirming the connection is active.

If the **Connect** button is replaced by a "Coming soon" label, the Twitter / X integration has not been enabled for your InterlinedList instance. Contact your site administrator.

### What Permissions InterlinedList Requests

InterlinedList requests the following access from Twitter / X:

- **Read your tweets** — needed to verify your account is reachable and to avoid duplicate posts.
- **Write tweets** — needed to post content to your timeline and create threads when a message is long.
- **Read your profile** — needed to display your username and avatar in Connected Accounts and in the compose toolbar.
- **Offline access** — needed to post on your behalf when you use scheduled posts, so the connection does not expire between when you schedule and when the post goes live.

InterlinedList does not read your direct messages, follow or unfollow anyone on your behalf, or access any information beyond what is listed above.

### Cross-Posting a Message to Twitter / X

Once your Twitter / X account is connected, the Twitter / X icon appears in the compose toolbar whenever you open the advanced posting panel.

1. Write your message in the compose box.
2. Click the **gear icon** next to the character counter to open the advanced posting panel.
3. Click the **Twitter / X icon** in the toolbar row. The icon turns blue to show it is active. A summary line below the compose box confirms that the post will go to Twitter / X.
4. Click **Post Message** to publish. Your message is saved on InterlinedList and sent to Twitter / X at the same time.

If the post is longer than 280 characters, InterlinedList automatically splits it into a numbered thread on Twitter / X so none of your content is cut off.

After posting, a brief status line beneath the compose box confirms whether Twitter / X received the post. If it failed, an error message is shown so you know to try again.

### Scheduling a Post to Twitter / X

You can schedule a message to appear on both InterlinedList and Twitter / X at a future date and time.

1. Write your message in the compose box.
2. Open the advanced posting panel (gear icon) and turn on the **Twitter / X** cross-post toggle.
3. Click the **calendar icon** in the toolbar to open the schedule dialog.
4. Choose a date and time in the future. The **Twitter / X** checkbox in the schedule dialog reflects the toggle you already set — tick it here if you have not already.
5. Click **Confirm**.
6. The compose button changes to **Schedule Message**. Click it to save the scheduled post.

When the scheduled time arrives, InterlinedList automatically publishes the message to your feed and cross-posts it to Twitter / X using your saved authorization.

You can edit a scheduled post before it goes live — see [Scheduled Posts](#scheduled-posts) for details on changing the time or adjusting which networks receive the post.

### Disconnecting Your Twitter / X Account

1. Go to **Settings > Connected Accounts**.
2. Find the **Twitter / X** card. Your username is shown there.
3. Click **Disconnect**.
4. The card returns to "Not connected". All stored authorization tokens are removed from InterlinedList.

Disconnecting does not delete any tweets that were already posted. If you later reconnect, the Twitter / X icon reappears in the compose toolbar automatically.

### Troubleshooting Twitter / X

**The Connect button is missing or shows "Coming soon."**

The Twitter / X integration requires configuration by the site administrator. If you see "Coming soon," the integration is not yet enabled for your InterlinedList instance. Contact your administrator.

**Authorization failed — I was redirected back to the login page with an error.**

This can happen if you cancel the Twitter / X permissions screen or if there is a temporary problem with Twitter / X's servers. Try again by returning to **Settings > Connected Accounts** and clicking **Connect**. If it keeps failing, check that your Twitter / X account is in good standing (not locked or suspended).

**My posts are not appearing on Twitter / X.**

- Check that the **Twitter / X** icon in the compose toolbar is highlighted blue before you submit. If it is grey, cross-posting is not enabled for that post.
- After posting, look for the status line below the compose box. It shows a confirmation if the post succeeded, or an error message if it did not.
- Go to **Settings > Connected Accounts** and click **Verify** on the Twitter / X card. If verification fails, try disconnecting and reconnecting your account.
- Twitter / X has its own rate limits. If you have posted many times in a short period, subsequent cross-posts may be delayed or rejected by Twitter / X. Wait a few minutes and try again.

**My account shows as "Not connected" even though I connected it recently.**

Your Twitter / X authorization may have expired or been revoked. This can happen if you changed your Twitter / X password, revoked app permissions from within Twitter / X's settings, or if there was a token refresh error. Go to **Settings > Connected Accounts** and reconnect your account to restore the link.

**A cross-post to Twitter / X failed but the message was saved on InterlinedList.**

Your message is safe on InterlinedList. The failure only means it was not sent to Twitter / X that time. You can manually share the post from InterlinedList, or try composing a new message with the Twitter / X toggle enabled.

---

## Scheduled Posts

Scheduling lets you write a message now and have it published automatically at a future date and time.

1. Write your message in the compose box.
2. Open the advanced posting panel (gear icon).
3. Click the **calendar icon** to open the schedule dialog.
4. Pick a date and time in the future. The dialog also shows checkboxes for any connected cross-post accounts (Mastodon, Bluesky, LinkedIn, Twitter / X) so you can decide which networks receive the post when it goes live.
5. Click **Confirm**. The compose button changes to **Schedule Message**. Click it to save the post.

A note below the compose button shows the scheduled date and time. To cancel scheduling and post immediately instead, click the displayed date.

**Editing a scheduled post:** Find the post in your scheduled posts list and click the edit icon. You can change the time, the message content, or which networks will receive it. If LinkedIn is selected, the editor shows the same checkbox list of LinkedIn destinations as the compose box, so you can choose your personal profile, one or more organization pages, or any combination. Save your changes and the post remains scheduled.

**Cancelling a scheduled post:** Open the edit dialog for the post and delete it, or cancel the scheduled time from within the compose box before you submit.

---

## Lists

Lists let you organize items — notes, links, tasks, or any structured data — into collections with custom fields.

- **Creating a list:** Click **New List** from the Lists page, give it a title and optional description, and choose whether it is public or private.
- **Adding data rows:** Open a list and use the row editor to add entries. Each list can have custom properties (text, number, date, and more) that act as columns.
- **Watching a list:** You can watch lists that belong to other users. Watchers receive updates when the list changes.
- **Connecting lists:** Lists can be linked to one another to show relationships between collections.
- **Exporting a list:** Lists can be exported to common formats. See [Exporting Your Data](#exporting-your-data) for details.
- **GitHub Issues sync:** If your GitHub account is connected with the issues scope, a list can be linked to a GitHub repository. Issues are pulled in and displayed as data rows.

### Searching Your Lists

A search bar on the Lists page lets you quickly find a list by name or description.

1. On the Lists page, type a word or phrase into the search field.
2. Results appear as you type — each matching list shows its name and whether it is public or private.
3. By default the search returns up to 20 results. If there are more matches, use the **Next** button (or page controls) to page through them.
4. Click any result to open that list.

### List Folders

Subscribers can group their lists into folders to keep them organised.

#### Creating a folder

1. On the Lists page, click **New Folder**.
2. Type a name for the folder and click **Create**.
3. The folder appears in the sidebar and in the folder view of your lists.

Folders can be nested inside other folders. When creating a folder you can optionally select a parent folder, or leave that field blank to create a top-level folder.

#### Renaming a folder

1. Hover over or select the folder you want to rename.
2. Click the **Rename** option that appears next to the folder name.
3. Type the new name and confirm. Each folder name must be unique within its parent level.

#### Moving a list into a folder

1. Open the list you want to move, or find it on the Lists page.
2. Click **Edit Schema** to open the edit view for that list.
3. In the edit view, locate the **Folder** field and choose the folder you want to move the list into from the drop-down.
4. Save your changes. The list will now appear inside the chosen folder.

#### Deleting a folder

1. Select the folder you want to remove.
2. Click **Delete Folder** and confirm the prompt.
3. The folder is removed. Any lists that were inside it are automatically moved back to the top level — they are not deleted.

### Toggling List Visibility

You can change a list between public and private at any time directly from the edit view, without having to rebuild the full schema.

1. Open the list you want to change.
2. Click **Edit Schema**.
3. In the edit view, find the **Visibility** section and select either **Public** or **Private**.
4. Click **Update Schema** to save. The new visibility takes effect immediately and is shown as a badge on the list card and in the list header.

---

## Documents

Documents give you a private writing space with folder organization.

- **Creating a document:** Go to the Documents page and click **New Document**. Give it a title and start writing.
- **Folders:** You can create folders and nest them to any depth to keep documents organized.
- **Public documents:** Toggle the **Public** switch on a document to make it visible to anyone with the link.

### Creating Subfolders

Folders can be nested inside other folders to any depth, so you can build whatever hierarchy works best for you. There are two ways to create a subfolder.

**From the folder page**

1. Open the folder you want to create a subfolder inside. You are taken to that folder's page, which lists its contents.
2. Click the **New Subfolder** button near the top of the page (it appears next to the **New Document** button).
3. A form opens asking for the new subfolder's name. Type a name and click **Create**.
4. The subfolder appears inside the current folder immediately.

**From the Documents tree sidebar**

1. Hover over any folder name in the left-side Documents tree. Three small icons appear next to the folder name: rename (pencil), new subfolder (folder-plus), and delete (trash).
2. Click the **folder-plus** icon for the folder you want to add a subfolder inside.
3. The subfolder creation form opens with the parent already selected. Type a name and click **Create**.
4. The new subfolder appears nested beneath its parent in the tree.

**Navigating nested folders**

When you are inside a subfolder, the breadcrumb bar at the top of the page shows the full path back to the root. Each step in the path — for example, **Documents > Parent Folder > Subfolder** — is a clickable link so you can jump back to any level in one click.

### Searching Your Documents

A search feature on the Documents page lets you find any document by its title or by words in its content.

1. On the Documents page, type a word or phrase into the search field.
2. Results are sorted by most recently updated and show the document title and the folder it belongs to.
3. By default up to 20 results are shown at once. If there are more matches, use the pagination controls to browse further pages.
4. Click a result to open and continue editing that document.

### Moving a Document to a Different Folder

After a document is created you can move it into any folder you own, or bring it back to the root level so it is not in any folder.

1. Open the document you want to move.
2. In the document toolbar, look for the **Move to folder** option (or open the document settings menu).
3. Choose a destination folder from the list. To remove the document from all folders, select **No folder (root)**.
4. The change is saved automatically. The folder tree in the sidebar updates to reflect the new location.

---

## Organizations

Organizations are shared spaces that multiple users can belong to.

- **Joining an organization:** Organizations can be public or invite-only. Browse public organizations and request to join, or accept an invitation from an administrator.
- **Roles:** Each member has a role (member or a higher level). Your role determines what you can do within the organization.
- **LinkedIn pages:** An organization owner or administrator can connect the organization's LinkedIn page and assign members to it. Assigned members can then cross-post to that page — it appears in their **Posting targets** list (see [LinkedIn](#linkedin) under Connected Accounts) and as a destination in the compose box.
- **Leaving an organization:** Open the organization settings and choose to leave.

---

## Following Other Users

You can follow other users to see their public posts in your feed.

- **Sending a follow request:** Visit a user's profile and click **Follow**. If their account is public, the follow is approved immediately. If their account is private, your request waits for them to approve it.
- **Approving followers:** When someone requests to follow your private account, you receive a notification. Go to your followers list to approve or decline.
- **Unfollowing:** Visit the profile and click **Unfollow**, or manage your following list from Settings.

---

## Notifications

The notification tray shows activity related to your account — new followers, follow requests, replies, pushes, and system announcements.

- Unread notifications are highlighted. Click a notification to navigate to the related content.
- Your notification tray displays your most recent notifications up to your configured limit (adjustable in Settings).
- You can also receive push notifications on your mobile device if you have the InterlinedList app installed and have granted notification permission (see [Mobile Push Notifications](#mobile-push-notifications)).

---

## Settings and Profile

Access **Settings** from the navigation to manage every aspect of your account.

- **Profile:** Update your display name, username, bio, and avatar.
- **Email:** Change your email address. A verification link is sent to your new address before the change takes effect.
- **Password:** Change your password at any time.
- **Theme:** Choose light, dark, or system theme.
- **Default visibility:** Set whether new posts default to public or private.
- **Messages per page:** Control how many posts appear in your feed at once.
- **Viewing preference:** Choose to see all messages or only public messages by default.
- **Show link previews:** Toggle whether URLs in posts expand into preview cards.
- **Advanced posting panel:** Keep the posting toolbar open by default so image, video, and cross-post controls are always visible.
- **Notification tray limit:** Set how many notifications the tray holds before older ones are dropped.
- **Connected Accounts:** Link and manage GitHub, Bluesky, LinkedIn, Mastodon, and Twitter / X (see [Connected Accounts](#connected-accounts)).
- **API / AI keys:** Store a personal OpenAI or Anthropic API key if any AI-assisted features are available on your instance.

---

## Subscriptions

Some advanced features require an active subscription. The gear icon in the compose box is available only to subscribers and unlocks:

- Image and video attachments
- Cross-posting to social networks
- Scheduled posts
- Tags
- Creating lists and list folders
- Creating documents

To subscribe, go to **Settings > Subscription** and follow the prompts to complete checkout. If you already subscribe and need to update billing details or cancel, the same page provides a link to the billing portal.

---

## Exporting Your Data

You can download copies of your data from InterlinedList.

- **Messages:** Export a full archive of your posts.
- **Lists:** Export list data including all rows and custom properties.

To start an export, go to **Settings > Export** (or the relevant section for the data type), choose the format, and download the file when it is ready.

---

## Mobile Push Notifications

If you use InterlinedList on an iOS device, you can enable push notifications to be alerted about new followers, replies, and other activity even when the app is in the background.

1. Open the InterlinedList app on your iOS device.
2. When prompted, allow notifications.
3. Notifications are delivered through Apple's notification service and appear in your device's notification centre.

If you stop receiving notifications, open the app and check that notifications are still allowed in your device's system settings under InterlinedList.

---

## Branding & Style Guide

This section is for community members, content creators, newsletter authors, podcast hosts, fan-site builders, and partners who want to represent InterlinedList visually in their own work. Whether you are designing a Discord banner, writing a blog post, or building a community theme, the information below tells you exactly what to use and how to use it.

---

### Brand Story

InterlinedList is a social list-management and cross-posting platform built around the idea of layers — lists within lists, connections between ideas, meaning threaded through everything. The name "Interlined" captures that spirit: content and structure woven together, not stacked on top of each other.

The visual identity draws from two overlapping worlds. **Ocean Blue** comes from deep-sea exploration — depth, calm, and discovery. **Emerald Green** brings in lush natural growth — momentum, freshness, and life. **Amber Gold** ties them together as the warm highlight that catches your eye and invites action.

Together these colours say: this is a thoughtful, organised, purposeful place to create.

---

### Logo Assets

The following logo files are available for use in community content. Always use the version that best suits your background.

| File | Best for |
| --- | --- |
| `logo-dark.svg` | Use on dark or coloured backgrounds |
| `logo-light.svg` | Use on white or light backgrounds |
| `logo-icon.png` | Small placements: avatars, favicons, app icons, profile pictures |
| `interlinedlist-logo-text.png` | Full logotype with the InterlinedList name — newsletters, headers, show-note banners |
| `interlinedlist-logo-only.png` | Clean icon without the text — good where the name appears separately nearby |
| `interlinedlist.svg` | Canonical vector file — scale to any size without quality loss |
| `interlinedlist.png` | Canonical raster — use when SVG is not supported |

> **Where to find them:** The `logo-dark.svg`, `logo-light.svg`, and `logo-icon.png` files live in the site's public assets folder. The full logotype, icon-only, canonical SVG, and canonical PNG are included in the branding package described in [Branding Package for Partners](#branding-package-for-partners).

---

### Logo Usage Rules

These rules keep the brand consistent and legible wherever it appears. They are written to be friendly, not legalistic — the goal is simply to make sure InterlinedList looks its best in your content.

**Do:**

- Use the dark logo variant on dark, coloured, or photographic backgrounds.
- Use the light logo variant on white or light backgrounds.
- Give the logo breathing room — leave clear space around it equal to roughly the height of the "I" in "Interlined."
- Use the icon-only version when space is very tight (profile pictures, small app tiles).
- Scale proportionally: hold shift when resizing to avoid distortion.

**Minimum sizes:**

| Version | Minimum height |
| --- | --- |
| Icon only | 24 px |
| Full logotype | 120 px |

**Do not:**

- Recolour the logo — use only the provided files as-is.
- Stretch, skew, rotate, or distort the logo in any direction.
- Apply drop shadows, glows, outlines, or other effects.
- Place the logo directly against a background that makes it hard to read (low contrast, busy patterns, clashing colours).
- Place another brand's logo immediately adjacent to the InterlinedList logo without clear visual separation between them.

---

### Brand Colors

#### Core logo colours

These are the three colours that define InterlinedList's visual identity. Use them as the foundation whenever you are building something that represents the brand.

| Colour name | Hex | When to use |
| --- | --- | --- |
| Ocean Blue | `#0F4C5F` | Primary brand colour — page headers, key call-to-action buttons, link accents |
| Emerald Green | `#34A56D` | Active states, success messages, "go" actions, growth-themed imagery |
| Amber Gold | `#F9AF36` | Highlights, badges, warm call-to-action buttons, anything that should draw the eye |
| Near Black | `#1A1A1A` | Dark mode backgrounds, body text on light surfaces |
| White | `#FFFFFF` | Light mode backgrounds, text on dark surfaces |

#### Extended palette (Darkone theme)

The interface uses additional colours for interactive states and feedback. These work well for community themes that want to feel native to the InterlinedList experience.

| Colour name | Hex | Use |
| --- | --- | --- |
| Violet / Purple | `#7E67FE` | Secondary accent, interactive highlights |
| Electric Blue | `#1A80F8` | Links, informational highlights |
| Teal Cyan | `#1AB0F8` | Info badges, tooltips |
| Vivid Green | `#21D760` | Confirmation states, live indicators |
| Alert Red | `#ED321F` | Error messages, warnings, destructive actions |

#### Dark mode background stack

The dark theme uses three progressively lighter background tones to create visual depth between page layers, cards, and nested panels.

| Level | Hex | Use |
| --- | --- | --- |
| Page / panel background | `#191E23` | Outermost background |
| Card background | `#1D2329` | Cards, sidebars |
| Nested panel / row | `#242B33` | Table rows, inner panels |

#### Hero gradient

The landing page hero uses a purple-violet gradient that adds warmth and energy to large background areas.

- Start: `#667EEA`
- End: `#764BA2`

This gradient works well for event banners, social media headers, and email header backgrounds where you want to evoke the InterlinedList landing experience.

---

### Typography

InterlinedList uses the **Play** typeface (available free from Google Fonts at `fonts.google.com`). Play is a clean, modern geometric sans-serif with a slightly technical character that complements the platform's data-forward personality without feeling cold.

| Property | Value |
| --- | --- |
| Primary typeface | Play (Regular 400, Bold 700) |
| Body line-height | 1.6 |
| Fallback stack | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (and more — see globals.css) |

**Using Play in your own content:**

1. Visit [fonts.google.com/specimen/Play](https://fonts.google.com/specimen/Play).
2. Click **Get font**, then **Get embed code**.
3. Paste the provided `<link>` tag into the `<head>` of your HTML, or download the font files for desktop publishing tools.

For non-web contexts (presentations, print, video thumbnails), any clean geometric sans-serif such as Roboto, Inter, or Nunito reads similarly well as a stand-in when Play is not available.

---

### The Darkone Theme

InterlinedList's interface is built on the **Darkone v1.0** Bootstrap admin theme. Understanding the theme helps community developers build tools and extensions that feel visually consistent with the platform.

Key characteristics of the theme:

- Deep, layered dark backgrounds designed to reduce eye strain during long sessions.
- High-contrast text against those backgrounds for comfortable reading.
- A consistent layout architecture: top navigation bar, collapsible sidebar, and content cards.
- Smooth transitions and subtle gradients throughout interactive elements.

The Darkone theme archive is included in the project for reference. If you are building a community tool or integration and want your UI to feel native to InterlinedList, the dark background stack in the [Brand Colors](#brand-colors) section above gives you the colour values you need without requiring a copy of the full theme.

---

### Branding Package for Partners

Community creators, platform integrators, and promotional partners can assemble a self-contained branding package from the available public assets. The package includes:

- **Logo files** — SVG (dark and light variants), PNG (full logotype and icon-only).
- **Colour token reference** — hex values, RGB equivalents, and CSS variable names for all core and extended colours.
- **Font reference** — Google Fonts URL and the full fallback stack.
- **Favicon** — the site favicon in SVG format.
- **Usage guidelines** — this document.

**Suggested package layout:**

```text
interlinedlist-brand/
  logos/
    logo-dark.svg
    logo-light.svg
    logo-icon.png
    logo-text.png
    favicon.svg
  colors/
    brand-colors.json
  fonts/
    README.md       (Google Fonts link + fallback stack)
  guidelines/
    usage.md
```

To assemble the package, gather the logo files from the site's public assets folder, export the colour values into a JSON file using the hex values listed in [Brand Colors](#brand-colors), and copy the font information from [Typography](#typography). The favicon SVG (`favicon.svg`) is also in the public assets folder.

If you are a partner who needs a pre-assembled ZIP, reach out through the InterlinedList contact page and the team can provide one.

---

### CSS Custom Properties Reference

If you are building a community theme, browser extension, or embedded widget that should feel consistent with InterlinedList's visual design, the following CSS custom properties are what the site uses internally. Setting these variables in your own stylesheet will give you the full light and dark colour system.

#### Light theme (default)

| Variable | Value | Purpose |
| --- | --- | --- |
| `--color-bg` | `#ffffff` | Page background |
| `--color-bg-secondary` | `#f8f9fa` | Secondary surfaces, alt table rows |
| `--color-bg-tertiary` | `#f5f5f5` | Tertiary surfaces, hover backgrounds |
| `--color-text` | `#333333` | Primary body text |
| `--color-text-secondary` | `#666666` | Secondary / muted text |
| `--color-text-tertiary` | `#999999` | Placeholder text, captions |
| `--color-border` | `#e5e5e5` | Borders and dividers |
| `--color-link` | `#0070f3` | Link colour |
| `--color-link-hover` | `#0051cc` | Link hover state |
| `--color-button-primary` | `#0070f3` | Primary button background |
| `--color-button-primary-hover` | `#0051cc` | Primary button hover |
| `--color-button-secondary` | `#6c757d` | Secondary button background |
| `--color-button-secondary-hover` | `#5a6268` | Secondary button hover |
| `--color-button-text` | `#ffffff` | Text on buttons |
| `--color-nav-bg` | `#ffffff` | Navigation bar background |
| `--color-nav-border` | `#e5e5e5` | Navigation bar border |
| `--color-success` | `#28a745` | Success text / icon |
| `--color-success-bg` | `#e6ffe6` | Success message background |
| `--color-error` | `#dc3545` | Error text / icon |
| `--color-error-bg` | `#ffe6e6` | Error message background |
| `--color-hero-gradient-start` | `#667eea` | Hero gradient start |
| `--color-hero-gradient-end` | `#764ba2` | Hero gradient end |

#### Dark theme (`[data-theme="dark"]`)

| Variable | Value | Purpose |
| --- | --- | --- |
| `--color-bg` | `#1a1a1a` | Page background |
| `--color-bg-secondary` | `#2d2d2d` | Secondary surfaces |
| `--color-bg-tertiary` | `#333333` | Tertiary surfaces |
| `--color-text` | `#ffffff` | Primary body text |
| `--color-text-secondary` | `#b3b3b3` | Secondary / muted text |
| `--color-text-tertiary` | `#808080` | Placeholder text, captions |
| `--color-border` | `#404040` | Borders and dividers |
| `--color-link` | `#4a9eff` | Link colour |
| `--color-link-hover` | `#6bb3ff` | Link hover state |
| `--color-button-primary` | `#4a9eff` | Primary button background |
| `--color-button-primary-hover` | `#6bb3ff` | Primary button hover |
| `--color-button-secondary` | `#6c757d` | Secondary button background |
| `--color-button-secondary-hover` | `#7d8489` | Secondary button hover |
| `--color-button-text` | `#ffffff` | Text on buttons |
| `--color-nav-bg` | `#1a1a1a` | Navigation bar background |
| `--color-nav-border` | `#404040` | Navigation bar border |
| `--color-success` | `#4ade80` | Success text / icon |
| `--color-success-bg` | `#1a3a2a` | Success message background |
| `--color-error` | `#f87171` | Error text / icon |
| `--color-error-bg` | `#3a1a1a` | Error message background |
| `--color-hero-gradient-start` | `#667eea` | Hero gradient start (same as light) |
| `--color-hero-gradient-end` | `#764ba2` | Hero gradient end (same as light) |

---

### Dos and Donts

A quick checklist to keep in mind whenever you are creating content that features InterlinedList.

**Do:**

- Use the provided logo files — do not recreate the logo by hand.
- Match the logo variant to the background (dark logo on dark surfaces, light logo on light surfaces).
- Use Ocean Blue (`#0F4C5F`), Emerald Green (`#34A56D`), and Amber Gold (`#F9AF36`) as your primary colour references.
- Use the Play typeface for headings and display text to match the brand feel.
- Give the logo adequate space — do not crowd it with other elements.
- Credit InterlinedList by name when featuring it in reviews, tutorials, or promotional content.

**Do not:**

- Recolour, distort, rotate, or add effects to the logo.
- Use the logo at sizes smaller than 24 px tall (icon) or 120 px tall (full logotype).
- Place the logo on a background that makes it hard to read.
- Imply official endorsement or partnership without written agreement from the InterlinedList team.
- Use InterlinedList's name or logo in a way that could mislead people about the source of your content.
- Combine the logo with other logos without clear visual separation.
