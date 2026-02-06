import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getListProperties, validateParentRelationship } from "@/lib/lists/queries";
import { parseDSLSchema, validateDSLSchema, parsedSchemaToDSL } from "@/lib/lists/dsl-parser";

export const dynamic = "force-dynamic";

/**
 * GET /api/lists/[id]/schema
 * Get list schema (properties) as DSL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

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

/**
 * PUT /api/lists/[id]/schema
 * Update list schema from DSL
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify list ownership
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

    const body = await request.json();
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
