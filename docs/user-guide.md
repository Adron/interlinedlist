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
   - [Searching Your Documents](#searching-your-documents)
   - [Moving a Document to a Different Folder](#moving-a-document-to-a-different-folder)
8. [Organizations](#organizations)
9. [Following Other Users](#following-other-users)
10. [Notifications](#notifications)
11. [Settings and Profile](#settings-and-profile)
12. [Subscriptions](#subscriptions)
13. [Exporting Your Data](#exporting-your-data)
14. [Mobile Push Notifications](#mobile-push-notifications)

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

Click the **LinkedIn icon** in the toolbar. If your message contains a URL, an extra option appears: **Post link(s) as first comment (LinkedIn)**. Checking this box places the URL in the first comment instead of in the body of the post, which can improve how LinkedIn presents the content.

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

**Editing a scheduled post:** Find the post in your scheduled posts list and click the edit icon. You can change the time, the message content, or which networks will receive it. Save your changes and the post remains scheduled.

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
- **Folders:** You can create folders and nest them to keep documents organized.
- **Public documents:** Toggle the **Public** switch on a document to make it visible to anyone with the link.

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
