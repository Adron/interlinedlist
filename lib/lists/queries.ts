/**
 * List Queries
 * 
 * Optimized query utilities with pagination, filtering, and JSONB query support
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ParsedField } from "./dsl-types";

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
  return entries.map(([key, value]) => ({
    rowData: {
      path: [key],
      equals: value,
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
  pagination: PaginationParams = {}
) {
  const { take, skip } = buildPagination(pagination);

  const [lists, total] = await Promise.all([
    prisma.list.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
      skip,
    }),
    prisma.list.count({
      where: {
        userId,
        deletedAt: null,
      },
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
