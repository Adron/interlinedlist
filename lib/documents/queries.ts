/**
 * Document and Folder queries for the documents feature
 */

import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export interface FolderWithChildren {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  children: FolderWithChildren[];
  documents: { id: string; title: string; relativePath: string }[];
}

/**
 * Get root folders for a user (parentId is null)
 */
export async function getRootFolders(userId: string) {
  return prisma.folder.findMany({
    where: { userId, parentId: null, deletedAt: null },
    include: {
      children: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      },
      documents: {
        where: { deletedAt: null },
        select: { id: true, title: true, relativePath: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Get a folder by ID with ownership check
 */
export async function getFolderById(folderId: string, userId: string) {
  return prisma.folder.findFirst({
    where: { id: folderId, userId, deletedAt: null },
    include: {
      children: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { relativePath: "asc" },
      },
    },
  });
}

/**
 * Get a document by ID with ownership check
 */
export async function getDocumentById(documentId: string, userId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, userId, deletedAt: null },
  });
}

/**
 * Get a document by ID for public access (if isPublic)
 */
export async function getPublicDocumentById(documentId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, isPublic: true, deletedAt: null },
  });
}

/**
 * Validate folder parent relationship (no circular refs)
 */
export async function validateFolderParent(
  folderId: string,
  parentId: string | null,
  userId: string
): Promise<boolean> {
  if (!parentId) return true;
  if (parentId === folderId) return false;

  const parent = await prisma.folder.findFirst({
    where: { id: parentId, userId, deletedAt: null },
    select: { parentId: true },
  });

  if (!parent) return false;

  let current: string | null = parentId;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current) || current === folderId) return false;
    visited.add(current);
    const parent: { parentId: string | null } | null =
      await prisma.folder.findFirst({
        where: { id: current, userId, deletedAt: null },
        select: { parentId: true },
      });
    current = parent?.parentId ?? null;
  }
  return true;
}

/**
 * Compute content hash for sync/conflict detection
 */
export function computeContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
