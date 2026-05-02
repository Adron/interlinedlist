# InterlinedList: Feedback Critique & Feature Review

This document cross-references the feedback from феедбацк.md with the current app implementation, identifying changes/improvements needed and future features to consider.

---

## Changes & Improvements

Based on current gaps between feedback and implementation:

1. **Clock prominence** — The clock widget exists in the RightSidebar but is not visible when scrolling the main feed. Move it to or duplicate in the top navigation bar so time is always visible, supporting the feedback request to help users know when it's time to rest.

2. **"Time to rest" nudge** — Add a subtle late-night indicator (e.g., a soft color shift or icon change after 11pm) to the clock widget to gently remind users it's getting late, addressing the feedback: "include the time so people know it is time to go to bed instead of scrolling."

3. **Priority color visualization** — Lists have typed fields via the DSL system, but there's no explicit visual priority-level display with color coding on the side of list rows or cards. Add a `priority` field type (with levels: low, medium, high, critical) and render color-coded left-border or background indicators on list rows and message cards.

4. **Document print view** — The markdown editor supports full document creation, but there's no print-optimized layout. Add a dedicated print CSS (`@media print`) and a "Print" button in the document header to support the feedback: "gives me the option to print things out if needed and lay everything out physically."

5. **CreateDocFromRowModal discoverability** — The ability to "turn ideas into structured documents" exists via `CreateDocFromRowModal`, but it's buried. Promote this in the list row context menu (right-click or action menu) and in the first-time user help content.

6. **Content category tagging on messages** — Messages currently have no tag or category system. Add optional tags (e.g., `#recipe`, `#music`, `#event`, `#inspiration`) to messages, enabling users to filter the feed by content type. This supports personal use cases: recipes, music ideas, and creative/inspiring content.

7. **List templates** — The list creation flow (`/lists/new`) supports manual DSL entry. Add a template library with pre-built list types:
   - Recipe list (ingredients, steps, prep time, servings, cuisine, difficulty)
   - Music/media clip list (title, artist, link, mood, use case)
   - Event/concert list (name, date, time, location, category, status)
   - Reading/inspiration list (title, author, link, category, notes)
   - This directly supports the personal use cases mentioned: recipes, music ideas, and creative inspiration.

8. **Visual idea connections** — The ERD diagram shows list relationships in a technical graph format, but it's not intuitive for everyday use. Add a simpler "idea board" or "relationship map" view using ReactFlow (already in the stack) with a cleaner layout. Display parent-child list connections and cross-referenced items visually, supporting the feedback: "I really like how you've connected different ideas within the app."

9. **Weather widget: time integration** — The weather and clock widgets are currently separate in the RightSidebar. Consider visually integrating them into a combined "Weather + Time" header card, or at minimum ensuring they're co-located and styled together so users see time context paired with their activity feed.

10. **Private account UX clarity** — The private/public toggle exists in settings, but when viewing your own profile, the visibility state isn't clearly surfaced. Add a banner or icon next to the username on your own profile page indicating whether the account is public or private.

---

## Feature Suggestions

Beyond the improvements above, these features would enhance the app based on feedback themes:

### Calendar & Events
- **Calendar / Event view** — A dedicated `/calendar` page where items tagged as events (from lists, scheduled posts, or messages) appear in a month/week/day calendar view. Support color-coded event types and date range highlighting, directly addressing: "it could be really powerful to integrate one [calendar]... Maybe highlight specific dates (e.g., with a color or marker) to show when events are happening."

- **Recurring events** — Allow list items or messages with dates to repeat (daily, weekly, monthly, yearly) for recurring activities like classes, choir rehearsals, or weekly meetings. Storage: add `recurrenceRule` (iCal RRULE format) to `Message` and `ListDataRow` models.

- **Instagram / social media event import** — A browser extension, share sheet, or manual import flow to capture event details (concert, class, meetup) from Instagram posts and add them to a list or the calendar. Parser would extract dates, times, location, and linked URLs from post captions/comments.

### Content Management & Organization
- **Recipe list type** — A specialized list template with semantic fields:
  - Ingredients (multiline text with quantity units)
  - Steps (ordered list with timing indicators)
  - Prep time, cook time, total time
  - Servings, difficulty, cuisine
  - Photo attachment
  - Optional: a "cooking mode" view with enlarged text, step-by-step navigation, and timer integration.

- **Media clip / inspiration board** — A Pinterest-style grid view for image-heavy lists (images displayed as cards with title overlays). Perfect for music inspiration, creative reference collections, and visual bookmarking. Toggle between table and grid views on `/lists/[id]`.

- **Shareable lists with embed code** — Allow users to generate a read-only public embed (iframe or shareable link) for a list, enabling external sharing of recipe collections, concert lists, or inspiration boards without requiring a full account.

### Daily Planning & Aggregation
- **Day planner view** — A `/planner` or `/today` page that aggregates:
  - Events from the calendar (today and next 7 days)
  - High-priority list items (all lists with a `priority: high/critical`)
  - Scheduled posts for today
  - Top-of-mind connections between ideas (via list relationships)
  - This turns "scattered inspiration into something actionable," per feedback.

- **Notification digest** — A daily or weekly email digest (configurable in settings) containing:
  - Upcoming events (next 7–14 days)
  - New high-priority list items
  - New connections detected between lists
  - Followers/follow requests
  - Scheduled post confirmations

### Advanced Discovery
- **Content-type specific views** — Dedicated view pages for recipes, events, and media:
  - `/recipes` — all recipe lists aggregated with search, filter by cuisine/difficulty, and a "make today" quick-add
  - `/events` — upcoming events from lists and calendar in timeline order
  - `/inspiration` — media clips and creative content in a visual grid

---

## Summary

The app already has the core features the feedback praises: organizing social media finds, weather widget, priority structure (via list DSL), idea connections, and document creation. The improvements focus on **visibility and discoverability** (clock prominence, print mode), **visual clarity** (priority colors, idea board), and **content organization** (templates, categories). The feature suggestions enable use cases directly mentioned in feedback: recipes, music, events, and ADHD-friendly planning workflows.
