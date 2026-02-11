/**
 * List Queries
 * 
 * Optimized query utilities with pagination, filtering, and JSONB query support
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ParsedField } from "./dsl-types";

/**
 * Validates that setting a parentId for a list would not create a circular reference
 * @param listId The ID of the list being updated
 * @param parentId The proposed parent ID (null is valid)
 * @param userId The user ID to ensure parent belongs to user
 * @returns true if valid, false if circular reference would be created
 */
export async function validateParentRelationship(
  listId: string,
  parentId: string | null,
  userId: string
): Promise<boolean> {
  // Null parent is always valid
  if (!parentId) {
    return true;
  }

  // Self-reference is allowed
  if (parentId === listId) {
    return true;
  }

  // Check if parent exists and belongs to user
  const parent = await prisma.list.findFirst({
    where: {
      id: parentId,
      userId,
      deletedAt: null,
    },
    select: {
      parentId: true,
    },
  });

  if (!parent) {
    return false; // Parent doesn't exist or doesn't belong to user
  }

  // Traverse parent chain to check for circular reference
  let currentParentId: string | null = parentId;
  const visited = new Set<string>();

  while (currentParentId) {
    // If we've visited this node before, there's a cycle
    if (visited.has(currentParentId)) {
      return false;
    }

    // If we encounter the listId in the chain, it's a circular reference
    if (currentParentId === listId) {
      return false;
    }

    visited.add(currentParentId);

    // Get the next parent
    const nextParent: { parentId: string | null } | null = await prisma.list.findFirst({
      where: {
        id: currentParentId,
        userId,
        deletedAt: null,
      },
      select: {
        parentId: true,
      },
    });

    currentParentId = nextParent?.parentId || null;
  }

  // No circular reference found
  return true;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number; // Alternative to offset, calculates offset = (page - 1) * limit
}

/**
 * List data filter options
 */
export interface ListDataFilter {
  [key: string]: any; // JSONB field filters
}

/**
 * List data sort options
 */
export interface ListDataSort {
  field?: string; // Field key to sort by
  order?: "asc" | "desc";
}

/**
 * Builds pagination parameters
 */
function buildPagination(params: PaginationParams): { take: number; skip: number } {
  const limit = params.limit ?? 100;
  const offset = params.offset ?? (params.page ? (params.page - 1) * limit : 0);

  return {
    take: Math.min(limit, 1000), // Cap at 1000 for safety
    skip: Math.max(0, offset),
  };
}

/**
 * Builds JSONB filter conditions for rowData queries
 * Converts simple key-value filters to Prisma JSONB filter format
 * Supports multiple filter conditions using AND clause
 * Returns an array of conditions to be used in the parent WHERE clause
 * Uses string_contains for partial text matching instead of exact equals
 */
function buildJSONBFilterConditions(filter: ListDataFilter): Prisma.ListDataRowWhereInput[] | undefined {
  if (!filter || Object.keys(filter).length === 0) {
    return undefined;
  }

  const entries = Object.entries(filter).filter(([_, value]) => value !== undefined && value !== null && value !== "");
  
  if (entries.length === 0) {
    return undefined;
  }

  // Return array of conditions, one for each filter key
  // Each condition filters on a specific path in the JSONB rowData field
  // Use string_contains for partial text matching (case-sensitive)
  // This works for string values. For arrays/numbers, we'd need raw SQL or different logic
  return entries.map(([key, value]) => ({
    rowData: {
      path: [key],
      string_contains: String(value),
    },
  }));
}

/**
 * Builds orderBy clause for list data rows
 */
function buildOrderBy(sort: ListDataSort | undefined): Prisma.ListDataRowOrderByWithRelationInput {
  if (sort?.field) {
    // For JSONB field sorting, we need to use raw SQL or a different approach
    // For now, fall back to createdAt
    // In production, you might want to use Prisma's raw queries for JSONB sorting
    return {
      createdAt: sort.order ?? "desc",
    };
  }

  return {
    createdAt: "desc",
  };
}

/**
 * Gets a list by ID with authorization check
 */
export async function getListById(listId: string, userId: string) {
  return await prisma.list.findFirst({
    where: {
      id: listId,
      userId,
      deletedAt: null,
    },
    include: {
      parent: {
        select: {
          id: true,
          title: true,
        },
      },
      properties: {
        orderBy: {
          displayOrder: "asc",
        },
      },
    },
  });
}

/**
 * Gets all lists for a user with pagination
 */
export async function getUserLists(
  userId: string,
  pagination: PaginationParams = {},
  options?: { isPublic?: boolean }
) {
  const { take, skip } = buildPagination(pagination);

  const whereClause: any = {
    userId,
    deletedAt: null,
  };

  if (options?.isPublic !== undefined) {
    whereClause.isPublic = options.isPublic;
  }

  const [lists, total] = await Promise.all([
    prisma.list.findMany({
      where: whereClause,
      include: {
        parent: {
          select: {
            id: true,
            title: true,
          },
        },
        children: {
          where: {
            deletedAt: null,
            ...(options?.isPublic !== undefined && { isPublic: options.isPublic }),
          },
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
      skip,
    }),
    prisma.list.count({
      where: whereClause,
    }),
  ]);

  return {
    lists,
    pagination: {
      total,
      limit: take,
      offset: skip,
      hasMore: skip + take < total,
    },
  };
}

/**
 * Gets all lists for a user with pagination, including properties (for ERD).
 * Same shape as getUserLists but each list has properties ordered by displayOrder.
 */
export async function getUserListsWithProperties(
  userId: string,
  pagination: PaginationParams = {},
  options?: { isPublic?: boolean }
) {
  const { take, skip } = buildPagination(pagination);

  const whereClause: any = {
    userId,
    deletedAt: null,
  };

  if (options?.isPublic !== undefined) {
    whereClause.isPublic = options.isPublic;
  }

  const [lists, total] = await Promise.all([
    prisma.list.findMany({
      where: whereClause,
      include: {
        parent: {
          select: {
            id: true,
            title: true,
          },
        },
        children: {
          where: {
            deletedAt: null,
            ...(options?.isPublic !== undefined && { isPublic: options.isPublic }),
          },
          select: {
            id: true,
            title: true,
          },
        },
        properties: {
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
      skip,
    }),
    prisma.list.count({
      where: whereClause,
    }),
  ]);

  return {
    lists,
    pagination: {
      total,
      limit: take,
      offset: skip,
      hasMore: skip + take < total,
    },
  };
}

/**
 * Gets public lists for a user with pagination
 */
export async function getPublicListsByUser(
  userId: string,
  pagination: PaginationParams = {}
) {
  return getUserLists(userId, pagination, { isPublic: true });
}

/**
 * Gets lists for parent selection (excludes a specific list if editing)
 */
export async function getListsForParentSelection(
  userId: string,
  excludeListId?: string
) {
  return await prisma.list.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(excludeListId && { id: { not: excludeListId } }),
    },
    select: {
      id: true,
      title: true,
      parentId: true,
    },
    orderBy: {
      title: "asc",
    },
  });
}

/**
 * Tree node structure for hierarchical list display
 */
export interface TreeNode {
  list: {
    id: string;
    title: string;
    parentId: string | null;
    [key: string]: any;
  };
  children: TreeNode[];
}

/**
 * Builds a hierarchical tree structure from a flat list of lists
 */
export function buildListTree(lists: Array<{ id: string; title: string; parentId: string | null; [key: string]: any }>): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes for all lists
  lists.forEach((list) => {
    map.set(list.id, { list, children: [] });
  });

  // Build tree by linking children to parents
  lists.forEach((list) => {
    const node = map.get(list.id)!;
    if (list.parentId && map.has(list.parentId)) {
      map.get(list.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * Converts Prisma ListProperty to ParsedField format
 */
function convertToParsedField(property: any): ParsedField {
  return {
    propertyKey: property.propertyKey,
    propertyName: property.propertyName,
    propertyType: property.propertyType,
    displayOrder: property.displayOrder,
    isRequired: property.isRequired,
    defaultValue: property.defaultValue,
    validationRules:
      property.validationRules && typeof property.validationRules === "object"
        ? (property.validationRules as Record<string, any>)
        : null,
    helpText: property.helpText,
    placeholder: property.placeholder,
    isVisible: property.isVisible,
    visibilityCondition:
      property.visibilityCondition && typeof property.visibilityCondition === "object"
        ? (property.visibilityCondition as Record<string, any>)
        : null,
  };
}

/**
 * Gets list properties (schema) for a list
 */
export async function getListProperties(
  listId: string,
  userId: string
): Promise<ParsedField[] | null> {
  // Verify list ownership
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      userId,
      deletedAt: null,
    },
  });

  if (!list) {
    return null;
  }

  const properties = await prisma.listProperty.findMany({
    where: {
      listId,
    },
    orderBy: {
      displayOrder: "asc",
    },
  });

  return properties.map(convertToParsedField);
}

/**
 * Gets list data rows with pagination, filtering, and sorting
 */
export async function getListDataRows(
  listId: string,
  userId: string,
  options: {
    pagination?: PaginationParams;
    filter?: ListDataFilter;
    sort?: ListDataSort;
  } = {}
) {
  // Verify list ownership
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      userId,
      deletedAt: null,
    },
  });

  if (!list) {
    throw new Error("List not found or access denied");
  }

  const { take, skip } = buildPagination(options.pagination ?? {});
  const jsonbFilterConditions = buildJSONBFilterConditions(options.filter ?? {});
  const orderBy = buildOrderBy(options.sort);

  const where: Prisma.ListDataRowWhereInput = {
    listId,
    deletedAt: null,
    ...(jsonbFilterConditions && {
      AND: jsonbFilterConditions,
    }),
  };

  const [rows, total] = await Promise.all([
    prisma.listDataRow.findMany({
      where,
      orderBy,
      take,
      skip,
    }),
    prisma.listDataRow.count({ where }),
  ]);

  return {
    rows,
    pagination: {
      total,
      limit: take,
      offset: skip,
      hasMore: skip + take < total,
    },
  };
}

/**
 * Gets list properties (schema) for a public list
 * No authentication required - verifies list exists and is public
 */
export async function getPublicListProperties(
  listId: string
): Promise<ParsedField[] | null> {
  // Verify list exists and is public
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      isPublic: true,
      deletedAt: null,
    },
  });

  if (!list) {
    return null;
  }

  const properties = await prisma.listProperty.findMany({
    where: {
      listId,
    },
    orderBy: {
      displayOrder: "asc",
    },
  });

  return properties.map(convertToParsedField);
}

/**
 * Gets list data rows for a public list
 * No authentication required - verifies list exists and is public
 */
export async function getPublicListDataRows(
  listId: string,
  options: {
    pagination?: PaginationParams;
    filter?: ListDataFilter;
    sort?: ListDataSort;
  } = {}
) {
  // Verify list exists and is public
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      isPublic: true,
      deletedAt: null,
    },
  });

  if (!list) {
    throw new Error("List not found or not public");
  }

  const { take, skip } = buildPagination(options.pagination ?? {});
  const jsonbFilterConditions = buildJSONBFilterConditions(options.filter ?? {});
  const orderBy = buildOrderBy(options.sort);

  const where: Prisma.ListDataRowWhereInput = {
    listId,
    deletedAt: null,
    ...(jsonbFilterConditions && {
      AND: jsonbFilterConditions,
    }),
  };

  const [rows, total] = await Promise.all([
    prisma.listDataRow.findMany({
      where,
      orderBy,
      take,
      skip,
    }),
    prisma.listDataRow.count({ where }),
  ]);

  return {
    rows,
    pagination: {
      total,
      limit: take,
      offset: skip,
      hasMore: skip + take < total,
    },
  };
}

/**
 * Gets a single list data row by ID
 */
export async function getListDataRowById(
  rowId: string,
  listId: string,
  userId: string
) {
  // Verify list ownership
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      userId,
      deletedAt: null,
    },
  });

  if (!list) {
    return null;
  }

  return await prisma.listDataRow.findFirst({
    where: {
      id: rowId,
      listId,
      deletedAt: null,
    },
  });
}

/**
 * Creates a list data row
 */
export async function createListDataRow(
  listId: string,
  userId: string,
  rowData: Record<string, any>
) {
  // Verify list ownership
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      userId,
      deletedAt: null,
    },
  });

  if (!list) {
    throw new Error("List not found or access denied");
  }

  return await prisma.listDataRow.create({
    data: {
      listId,
      rowData: rowData as Prisma.InputJsonValue,
    },
  });
}

/**
 * Updates a list data row
 */
export async function updateListDataRow(
  rowId: string,
  listId: string,
  userId: string,
  rowData: Record<string, any>
) {
  // Verify list ownership
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      userId,
      deletedAt: null,
    },
  });

  if (!list) {
    throw new Error("List not found or access denied");
  }

  return await prisma.listDataRow.update({
    where: {
      id: rowId,
    },
    data: {
      rowData: rowData as Prisma.InputJsonValue,
    },
  });
}

/**
 * Deletes a list data row (soft delete)
 */
export async function deleteListDataRow(
  rowId: string,
  listId: string,
  userId: string
) {
  // Verify list ownership
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      userId,
      deletedAt: null,
    },
  });

  if (!list) {
    throw new Error("List not found or access denied");
  }

  return await prisma.listDataRow.updateMany({
    where: {
      id: rowId,
      listId: listId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });
}

/**
 * Bulk creates list data rows
 */
export async function bulkCreateListDataRows(
  listId: string,
  userId: string,
  rowsData: Record<string, any>[]
) {
  // Verify list ownership
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      userId,
      deletedAt: null,
    },
  });

  if (!list) {
    throw new Error("List not found or access denied");
  }

  // Limit bulk operations to prevent abuse
  if (rowsData.length > 1000) {
    throw new Error("Cannot create more than 1000 rows at once");
  }

  return await prisma.listDataRow.createMany({
    data: rowsData.map((rowData) => ({
      listId,
      rowData: rowData as Prisma.InputJsonValue,
    })),
  });
}
