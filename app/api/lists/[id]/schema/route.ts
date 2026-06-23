import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserOrSyncToken } from "@/lib/auth/sync-token";
import { getListProperties, validateParentRelationship } from "@/lib/lists/queries";
import { parseDSLSchema, validateDSLSchema, parsedSchemaToDSL } from "@/lib/lists/dsl-parser";

export const dynamic = "force-dynamic";

const ALLOWED_PROPERTY_TYPES = new Set([
  "text",
  "number",
  "boolean",
  "date",
  "url",
  "email",
]);

/**
 * GET /api/lists/[id]/schema
 * Get list schema (properties) as DSL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserOrSyncToken(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await prisma.list.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const properties = await getListProperties(params.id, user.id);

    if (!properties) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Convert to DSL format
    const dsl = parsedSchemaToDSL({
      title: list.title,
      description: list.description,
      fields: properties.map((prop) => ({
        propertyKey: prop.propertyKey,
        propertyName: prop.propertyName,
        propertyType: prop.propertyType,
        displayOrder: prop.displayOrder,
        isRequired: prop.isRequired,
        defaultValue: prop.defaultValue,
        validationRules: prop.validationRules as any,
        helpText: prop.helpText,
        placeholder: prop.placeholder,
        isVisible: prop.isVisible,
        visibilityCondition: prop.visibilityCondition as any,
      })),
    });

    return NextResponse.json({ data: dsl }, { status: 200 });
  } catch (error) {
    console.error("Get list schema error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

type IncomingProperty = {
  id?: string | null;
  propertyKey: string;
  propertyName: string;
  propertyType: string;
  displayOrder?: number;
  isVisible?: boolean;
  isRequired?: boolean;
  defaultValue?: string | null;
  helpText?: string | null;
  placeholder?: string | null;
};

async function updateSchemaNonDestructive(
  request: NextRequest,
  listId: string,
  userId: string,
  body: { properties: unknown }
) {
  // Ownership: 403 when the list belongs to another user, 404 when missing.
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!list || list.deletedAt) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
  if (list.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!Array.isArray(body.properties)) {
    return NextResponse.json(
      { error: "`properties` must be an array" },
      { status: 400 }
    );
  }
  const incoming = body.properties as IncomingProperty[];

  // Per-property shape and value validation
  const seenKeys = new Set<string>();
  for (const prop of incoming) {
    if (typeof prop !== "object" || prop === null) {
      return NextResponse.json(
        { error: "Each property must be an object" },
        { status: 400 }
      );
    }
    if (
      typeof prop.propertyKey !== "string" ||
      prop.propertyKey.length < 1 ||
      prop.propertyKey.length > 60
    ) {
      return NextResponse.json(
        { error: "propertyKey must be a string of 1–60 characters" },
        { status: 400 }
      );
    }
    if (
      typeof prop.propertyName !== "string" ||
      prop.propertyName.length < 1 ||
      prop.propertyName.length > 120
    ) {
      return NextResponse.json(
        { error: "propertyName must be a string of 1–120 characters" },
        { status: 400 }
      );
    }
    if (!ALLOWED_PROPERTY_TYPES.has(prop.propertyType)) {
      return NextResponse.json(
        {
          error: `Unknown propertyType '${prop.propertyType}'. Allowed: ${Array.from(ALLOWED_PROPERTY_TYPES).join(", ")}`,
        },
        { status: 400 }
      );
    }
    if (seenKeys.has(prop.propertyKey)) {
      return NextResponse.json(
        { error: `Duplicate propertyKey '${prop.propertyKey}' in request` },
        { status: 400 }
      );
    }
    seenKeys.add(prop.propertyKey);
  }

  // Load existing properties
  const existing = await prisma.listProperty.findMany({
    where: { listId },
  });
  const existingById = new Map(existing.map((p) => [p.id, p]));

  // Validate id references and reject propertyKey changes for existing rows
  for (const prop of incoming) {
    if (prop.id != null) {
      const current = existingById.get(prop.id);
      if (!current) {
        return NextResponse.json(
          { error: `Property id '${prop.id}' does not exist on this list` },
          { status: 400 }
        );
      }
      if (current.propertyKey !== prop.propertyKey) {
        return NextResponse.json(
          {
            error:
              "propertyKey cannot change for an existing property; rename propertyName instead",
          },
          { status: 400 }
        );
      }
    }
  }

  // Diff: anything not referenced by `id` in the incoming set is a delete
  const incomingIds = new Set(
    incoming.filter((p) => p.id != null).map((p) => p.id as string)
  );
  const toDelete = existing.filter((p) => !incomingIds.has(p.id));

  // Force confirmation when any deleted property has non-null row data
  const force = request.nextUrl.searchParams.get("force") === "true";
  if (!force && toDelete.length > 0) {
    const rows = await prisma.listDataRow.findMany({
      where: { listId, deletedAt: null },
      select: { rowData: true },
    });
    const keysWithData = new Set<string>();
    for (const row of rows) {
      const data = row.rowData as Record<string, unknown> | null;
      if (!data) continue;
      for (const p of toDelete) {
        const v = data[p.propertyKey];
        if (v !== undefined && v !== null && v !== "") {
          keysWithData.add(p.propertyKey);
        }
      }
    }
    if (keysWithData.size > 0) {
      return NextResponse.json(
        {
          error:
            "Some properties marked for deletion contain row data. Re-submit with ?force=true to confirm.",
          propertiesWithData: Array.from(keysWithData),
        },
        { status: 409 }
      );
    }
  }

  // Apply changes in a transaction. displayOrder is authoritative:
  // re-number contiguously from 0 based on the order received from the client.
  await prisma.$transaction(async (tx) => {
    if (toDelete.length > 0) {
      await tx.listProperty.deleteMany({
        where: { id: { in: toDelete.map((p) => p.id) } },
      });
      const deleteKeys = toDelete.map((p) => p.propertyKey);
      const rows = await tx.listDataRow.findMany({
        where: { listId },
        select: { id: true, rowData: true },
      });
      for (const row of rows) {
        const data = { ...((row.rowData as Record<string, unknown>) ?? {}) };
        let changed = false;
        for (const key of deleteKeys) {
          if (key in data) {
            delete data[key];
            changed = true;
          }
        }
        if (changed) {
          await tx.listDataRow.update({
            where: { id: row.id },
            data: { rowData: data as Prisma.InputJsonValue },
          });
        }
      }
    }

    for (let i = 0; i < incoming.length; i++) {
      const prop = incoming[i];
      const displayOrder = i;
      const common = {
        propertyName: prop.propertyName,
        propertyType: prop.propertyType,
        displayOrder,
        isVisible: prop.isVisible ?? true,
        isRequired: prop.isRequired ?? false,
        defaultValue: prop.defaultValue ?? null,
        helpText: prop.helpText ?? null,
        placeholder: prop.placeholder ?? null,
      };
      if (prop.id != null) {
        await tx.listProperty.update({
          where: { id: prop.id },
          data: common,
        });
      } else {
        await tx.listProperty.create({
          data: {
            listId,
            propertyKey: prop.propertyKey,
            ...common,
          },
        });
      }
    }
  });

  const updated = await prisma.listProperty.findMany({
    where: { listId },
    orderBy: { displayOrder: "asc" },
  });

  return NextResponse.json({ properties: updated }, { status: 200 });
}

/**
 * PUT /api/lists/[id]/schema
 *
 * Two body shapes are supported, selected by the request payload:
 *
 *  1. Non-destructive update — body has a `properties` array. Updates,
 *     creates, and deletes individual ListProperty rows while preserving
 *     row data for unchanged keys. Use `?force=true` to confirm deletes
 *     that would discard non-null row data.
 *
 *  2. Destructive DSL rebuild — body has a `schema` string (DSL). Wipes
 *     and recreates the entire property set. Preserved for backward
 *     compatibility with existing clients.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserOrSyncToken(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body && Array.isArray(body.properties)) {
      return await updateSchemaNonDestructive(request, params.id, user.id, body);
    }

    // Verify list ownership (destructive DSL flow keeps the existing
    // 404-for-cross-user behavior so existing clients are unaffected).
    const list = await prisma.list.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const { schema, parentId, isPublic } = body;

    if (!schema) {
      return NextResponse.json({ error: "Schema is required" }, { status: 400 });
    }

    // Validate parentId if provided
    if (parentId !== undefined) {
      if (parentId !== null && typeof parentId !== "string") {
        return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
      }

      if (parentId !== null) {
        // Check if parent exists and belongs to user
        const parent = await prisma.list.findFirst({
          where: {
            id: parentId,
            userId: user.id,
            deletedAt: null,
          },
        });

        if (!parent) {
          return NextResponse.json(
            { error: "Parent list not found or access denied" },
            { status: 404 }
          );
        }

        // Validate no circular reference
        const isValid = await validateParentRelationship(params.id, parentId, user.id);
        if (!isValid) {
          return NextResponse.json(
            { error: "Setting this parent would create a circular reference" },
            { status: 400 }
          );
        }
      }
    }

    // Validate and parse DSL schema
    let parsedSchema;
    try {
      const validated = validateDSLSchema(schema);
      parsedSchema = parseDSLSchema(validated);
    } catch (error: any) {
      return NextResponse.json(
        { error: `Invalid schema: ${error.message}` },
        { status: 400 }
      );
    }

    // Update list title, description, parentId, and isPublic from parsed schema
    await prisma.list.update({
      where: { id: params.id },
      data: {
        title: parsedSchema.title,
        description: parsedSchema.description,
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(isPublic !== undefined && { isPublic: isPublic === true }),
      },
    });

    // Delete existing properties
    await prisma.listProperty.deleteMany({
      where: { listId: params.id },
    });

    // Create new properties
    if (parsedSchema.fields.length > 0) {
      await prisma.listProperty.createMany({
        data: parsedSchema.fields.map((field) => ({
          listId: params.id,
          propertyKey: field.propertyKey,
          propertyName: field.propertyName,
          propertyType: field.propertyType,
          displayOrder: field.displayOrder,
          isRequired: field.isRequired,
          defaultValue: field.defaultValue,
          validationRules: field.validationRules
            ? (field.validationRules as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          helpText: field.helpText,
          placeholder: field.placeholder,
          isVisible: field.isVisible,
          visibilityCondition: field.visibilityCondition
            ? (field.visibilityCondition as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        })),
      });
    }

    // Fetch updated list with properties
    const updatedList = await prisma.list.findUnique({
      where: { id: params.id },
      include: {
        properties: {
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
    });

    return NextResponse.json(
      { message: "Schema updated successfully", data: updatedList },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update list schema error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
