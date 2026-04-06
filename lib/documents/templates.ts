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
