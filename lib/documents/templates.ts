import { prisma } from "@/lib/prisma";
import { computeContentHash } from "@/lib/documents/queries";

export const TEMPLATE_FOLDER_NAME = "_templates";

const RECIPE_MARKDOWN = `# Recipe

## Overview

Brief description of the dish.

## Servings

-

## Prep & cook time

- Prep:
- Cook:

## Ingredients

-

## Instructions

1.

## Notes

`;

const SOCIAL_MEDIA_CAMPAIGN_MARKDOWN = `# Social Media Campaign

## Objectives

-

## Target audience

-

## Channels & formats

-

## Key messages

-

## Content calendar

| Date | Platform | Topic / asset | Owner |
|------|----------|---------------|-------|
|      |          |               |       |

## Metrics

-
`;

const POST_SERIES_PLAN_MARKDOWN = `# Post Series Plan

## Series title

## Goal

What should readers take away from this series?

## Posts

| # | Working title | Key point | Status |
|---|--------------|-----------|--------|
| 1 |              |           | Draft  |
| 2 |              |           |        |
| 3 |              |           |        |

## Publish schedule

- Frequency:
- Start date:

## Notes

`;

const THREAD_OUTLINE_MARKDOWN = `# Thread Outline

## Topic

## Hook (post 1)

## Posts

1.
2.
3.
4.
5.

## Call to action (final post)

## Cross-post to

- [ ] Bluesky
- [ ] Mastodon

## Notes

`;

const WEEKLY_DIGEST_MARKDOWN = `# Weekly Digest

## Week of

## Highlights

-

## What I shipped

-

## What I learned

-

## Links worth sharing

-

## What's next

-
`;

const ANNOUNCEMENT_MARKDOWN = `# Announcement

## What

One sentence summary of what you're announcing.

## Why it matters

## Details

## Call to action

## Publish to

- [ ] Bluesky
- [ ] Mastodon
- [ ] Newsletter

## Go-live date

`;

const RELEASE_NOTES_MARKDOWN = `# Release Notes

## Version

## Release date

## What's new

-

## Improvements

-

## Bug fixes

-

## Breaking changes

-

## Upgrade notes

`;

const MEETING_NOTES_MARKDOWN = `# Meeting Notes

## Date

## Attendees

-

## Agenda

1.
2.
3.

## Discussion

## Decisions

-

## Action items

| Action | Owner | Due |
|--------|-------|-----|
|        |       |     |

## Next meeting

`;

const PROJECT_BRIEF_MARKDOWN = `# Project Brief

## Overview

One paragraph description of the project.

## Problem

What problem does this solve?

## Goals

-

## Non-goals

-

## Stakeholders

-

## Timeline

| Milestone | Target date |
|-----------|------------|
|           |            |

## Open questions

-
`;

const PERSONAL_BIO_MARKDOWN = `# Personal Bio

## Short bio (1–2 sentences)

## Extended bio (paragraph)

## What I'm working on

-

## Interests

-

## Links

- Website:
- Mastodon:
- Bluesky:

## Notes

`;

const READING_NOTES_MARKDOWN = `# Reading Notes

## Title

## Author

## Type

- [ ] Book
- [ ] Article
- [ ] Paper
- [ ] Post

## Summary

## Key ideas

-

## Quotes worth keeping

>

## My take

## Related reading

-
`;

const INTERVIEW_GUIDE_MARKDOWN = `# Interview Guide

## Subject

## Date

## Context

## Questions

1.
2.
3.
4.
5.

## Follow-up threads

-

## Raw notes

## Key quotes

>

## Summary
`;

const RETROSPECTIVE_MARKDOWN = `# Retrospective

## Project / sprint

## Period

## What went well

-

## What didn't go well

-

## What surprised us

-

## Action items

| Action | Owner | Due |
|--------|-------|-----|
|        |       |     |

## Notes

`;

const DECISION_RECORD_MARKDOWN = `# Decision Record

## Title

## Date

## Status

- [ ] Proposed
- [ ] Accepted
- [ ] Deprecated

## Context

What situation forced this decision?

## Options considered

1.
2.
3.

## Decision

What did we choose and why?

## Consequences

What becomes easier or harder as a result?
`;

const EVENT_RECAP_MARKDOWN = `# Event Recap

## Event name

## Date & location

## Why I attended

## Sessions / highlights

-

## People I met

-

## Key takeaways

-

## What I'll do differently

-

## Share-worthy moments

`;

const HOW_TO_GUIDE_MARKDOWN = `# How-To Guide

## Title

## Audience

Who is this for?

## Prerequisites

-

## Steps

1.
2.
3.

## Troubleshooting

| Problem | Fix |
|---------|-----|
|         |     |

## See also

-
`;

const NEWSLETTER_MARKDOWN = `# Newsletter

## Issue number & date

## Subject line

## Opening

## Main story

## Quick hits

-

## Link of the week

## Closing

## Unsubscribe / footer copy

`;

const CHANGELOG_ENTRY_MARKDOWN = `# Changelog

## [Unreleased]

### Added

-

### Changed

-

### Fixed

-

### Removed

-

## Notes

`;

const CONTENT_BRIEF_MARKDOWN = `# Content Brief

## Working title

## Format

- [ ] Post  - [ ] Thread  - [ ] Long-form  - [ ] Video  - [ ] Podcast

## Goal

What should this piece accomplish?

## Audience

## Key message (one sentence)

## Supporting points

-

## Tone

## References / research

-

## Deadline

## Assignee

`;

const PODCAST_SHOW_NOTES_MARKDOWN = `# Podcast Show Notes

## Episode title

## Episode number

## Guest(s)

## Release date

## Summary (2–3 sentences)

## Timestamps

| Time | Topic |
|------|-------|
|      |       |

## Links mentioned

-

## Transcript / highlights

## Call to action

`;

const VIDEO_SCRIPT_MARKDOWN = `# Video Script

## Title

## Platform

## Duration target

## Hook (0:00–0:15)

## Main content

### Section 1

### Section 2

### Section 3

## Call to action

## B-roll / visual notes

## Tags & description

`;

const COMMUNITY_GUIDELINES_MARKDOWN = `# Community Guidelines

## Purpose

What is this community for?

## Values

-

## Expected behavior

-

## Unacceptable behavior

-

## Enforcement

1.
2.
3.

## How to report

## Acknowledgements

`;

const FAQ_MARKDOWN = `# FAQ

## Topic

### Question 1?

Answer.

### Question 2?

Answer.

### Question 3?

Answer.

## Still have questions?

`;

const REVIEW_MARKDOWN = `# Review

## Subject

## Type

- [ ] Book  - [ ] Product  - [ ] Event  - [ ] Tool  - [ ] Other

## Rating

/5

## Summary (one sentence)

## What I liked

-

## What I didn't like

-

## Who it's for

## Final verdict

`;

const GOAL_SETTING_MARKDOWN = `# Goals

## Period

## Theme / focus

## Goals

| Goal | Why it matters | Success metric | Due |
|------|---------------|----------------|-----|
|      |               |                |     |

## Habits to build

-

## Habits to drop

-

## Mid-period check-in notes

## End-of-period review

`;

const LIST_SCHEMA_DESIGN_MARKDOWN = `# List Schema Design

## List name

## Purpose

What will people track with this list?

## Fields

| Field key | Display name | Type | Required | Notes |
|-----------|-------------|------|----------|-------|
|           |             |      |          |       |

## Field types available

text · number · url · date · select · textarea · priority · checkbox

## Sample row

| Field | Value |
|-------|-------|
|       |       |

## Notes

`;

const CROSS_POST_STRATEGY_MARKDOWN = `# Cross-Post Strategy

## Topic / campaign

## Core message

One sentence that stays consistent across all platforms.

## Platform variations

### Bluesky

Character limit: 300

### Mastodon

Character limit: 500

### Long-form (document / newsletter)

## Timing

| Platform | Scheduled time |
|----------|---------------|
| Bluesky  |               |
| Mastodon |               |

## Goals

-

## Notes

`;

export async function getOrCreateTemplatesFolder(
  userId: string
): Promise<{ folderId: string; created: boolean }> {
  const existing = await prisma.folder.findFirst({
    where: {
      userId,
      parentId: null,
      name: TEMPLATE_FOLDER_NAME,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (existing) {
    return { folderId: existing.id, created: false };
  }
  const folder = await prisma.folder.create({
    data: { userId, parentId: null, name: TEMPLATE_FOLDER_NAME },
  });
  return { folderId: folder.id, created: true };
}

export async function listTemplateDocuments(userId: string, folderId: string) {
  return prisma.document.findMany({
    where: { userId, folderId, deletedAt: null },
    orderBy: { relativePath: "asc" },
    select: { id: true, title: true, relativePath: true },
  });
}

export async function seedDefaultTemplates(userId: string, folderId: string) {
  const defaults: { relativePath: string; title: string; content: string }[] =
    [
      {
        relativePath: "recipe.md",
        title: "Recipe",
        content: RECIPE_MARKDOWN,
      },
      {
        relativePath: "social-media-campaign.md",
        title: "Social Media Campaign",
        content: SOCIAL_MEDIA_CAMPAIGN_MARKDOWN,
      },
      {
        relativePath: "post-series-plan.md",
        title: "Post Series Plan",
        content: POST_SERIES_PLAN_MARKDOWN,
      },
      {
        relativePath: "thread-outline.md",
        title: "Thread Outline",
        content: THREAD_OUTLINE_MARKDOWN,
      },
      {
        relativePath: "weekly-digest.md",
        title: "Weekly Digest",
        content: WEEKLY_DIGEST_MARKDOWN,
      },
      {
        relativePath: "announcement.md",
        title: "Announcement",
        content: ANNOUNCEMENT_MARKDOWN,
      },
      {
        relativePath: "release-notes.md",
        title: "Release Notes",
        content: RELEASE_NOTES_MARKDOWN,
      },
      {
        relativePath: "meeting-notes.md",
        title: "Meeting Notes",
        content: MEETING_NOTES_MARKDOWN,
      },
      {
        relativePath: "project-brief.md",
        title: "Project Brief",
        content: PROJECT_BRIEF_MARKDOWN,
      },
      {
        relativePath: "personal-bio.md",
        title: "Personal Bio",
        content: PERSONAL_BIO_MARKDOWN,
      },
      {
        relativePath: "reading-notes.md",
        title: "Reading Notes",
        content: READING_NOTES_MARKDOWN,
      },
      {
        relativePath: "interview-guide.md",
        title: "Interview Guide",
        content: INTERVIEW_GUIDE_MARKDOWN,
      },
      {
        relativePath: "retrospective.md",
        title: "Retrospective",
        content: RETROSPECTIVE_MARKDOWN,
      },
      {
        relativePath: "decision-record.md",
        title: "Decision Record",
        content: DECISION_RECORD_MARKDOWN,
      },
      {
        relativePath: "event-recap.md",
        title: "Event Recap",
        content: EVENT_RECAP_MARKDOWN,
      },
      {
        relativePath: "how-to-guide.md",
        title: "How-To Guide",
        content: HOW_TO_GUIDE_MARKDOWN,
      },
      {
        relativePath: "newsletter.md",
        title: "Newsletter",
        content: NEWSLETTER_MARKDOWN,
      },
      {
        relativePath: "changelog.md",
        title: "Changelog",
        content: CHANGELOG_ENTRY_MARKDOWN,
      },
      {
        relativePath: "content-brief.md",
        title: "Content Brief",
        content: CONTENT_BRIEF_MARKDOWN,
      },
      {
        relativePath: "podcast-show-notes.md",
        title: "Podcast Show Notes",
        content: PODCAST_SHOW_NOTES_MARKDOWN,
      },
      {
        relativePath: "video-script.md",
        title: "Video Script",
        content: VIDEO_SCRIPT_MARKDOWN,
      },
      {
        relativePath: "community-guidelines.md",
        title: "Community Guidelines",
        content: COMMUNITY_GUIDELINES_MARKDOWN,
      },
      {
        relativePath: "faq.md",
        title: "FAQ",
        content: FAQ_MARKDOWN,
      },
      {
        relativePath: "review.md",
        title: "Review",
        content: REVIEW_MARKDOWN,
      },
      {
        relativePath: "goal-setting.md",
        title: "Goal Setting",
        content: GOAL_SETTING_MARKDOWN,
      },
      {
        relativePath: "list-schema-design.md",
        title: "List Schema Design",
        content: LIST_SCHEMA_DESIGN_MARKDOWN,
      },
      {
        relativePath: "cross-post-strategy.md",
        title: "Cross-Post Strategy",
        content: CROSS_POST_STRATEGY_MARKDOWN,
      },
    ];

  for (const d of defaults) {
    const exists = await prisma.document.findFirst({
      where: {
        userId,
        folderId,
        relativePath: d.relativePath,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (exists) continue;

    const contentHash = computeContentHash(d.content);
    await prisma.document.create({
      data: {
        userId,
        folderId,
        title: d.title,
        content: d.content,
        relativePath: d.relativePath,
        contentHash,
      },
    });
  }
}

function stemFromTitle(title: string): string {
  const t = title.trim();
  const slug = t
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

/**
 * Picks a unique relativePath within the given folder (or root when folderId is null).
 */
export async function allocateUniqueRelativePath(
  userId: string,
  folderId: string | null,
  title: string
): Promise<string> {
  const stem = stemFromTitle(title);
  let n = 1;
  while (true) {
    const relativePath = n === 1 ? `${stem}.md` : `${stem}-${n}.md`;
    const existing = await prisma.document.findFirst({
      where: {
        userId,
        folderId,
        relativePath,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!existing) return relativePath;
    n += 1;
  }
}

export async function getTemplatesFolderId(userId: string): Promise<string | null> {
  const row = await prisma.folder.findFirst({
    where: {
      userId,
      parentId: null,
      name: TEMPLATE_FOLDER_NAME,
      deletedAt: null,
    },
    select: { id: true },
  });
  return row?.id ?? null;
}
