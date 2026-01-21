import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { parseDSLSchema, validateDSLSchema } from "@/lib/lists/dsl-parser";
import { getUserLists } from "@/lib/lists/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/lists
 * Get all lists for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;

    const result = await getUserLists(user.id, {
      limit,
      offset: page ? undefined : offset,
      page,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Get lists error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/lists
 * Create a new list with schema from DSL
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, messageId, metadata, schema } = body;

    // Validate required fields
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Validate and parse DSL schema if provided
    let parsedSchema = null;
    if (schema) {
      try {
        const validated = validateDSLSchema(schema);
        parsedSchema = parseDSLSchema(validated);
      } catch (error: any) {
        return NextResponse.json(
          { error: `Invalid schema: ${error.message}` },
          { status: 400 }
        );
      }
    }

    // Create list
    const list = await prisma.list.create({
      data: {
        userId: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        messageId: messageId || null,
        metadata: metadata || null,
      },
    });

    // Create properties if schema provided
    if (parsedSchema && parsedSchema.fields.length > 0) {
      await prisma.listProperty.createMany({
        data: parsedSchema.fields.map((field) => ({
          listId: list.id,
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

    // Fetch created list with properties
    const createdList = await prisma.list.findUnique({
      where: { id: list.id },
      include: {
        properties: {
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
    });

    return NextResponse.json(
      { message: "List created successfully", data: createdList },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
