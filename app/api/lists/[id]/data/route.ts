import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getListDataRows,
  createListDataRow,
  bulkCreateListDataRows,
} from "@/lib/lists/queries";
import { validateFormData } from "@/lib/lists/dsl-validator";
import { getListProperties } from "@/lib/lists/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/lists/[id]/data
 * Get list data rows with pagination, filtering, and sorting
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;

    // Parse filter from query params (simple key-value pairs)
    const filter: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      if (!["limit", "offset", "page", "sort", "order"].includes(key)) {
        filter[key] = value;
      }
    });

    // Parse sort
    const sortField = searchParams.get("sort");
    const sortOrder = searchParams.get("order") as "asc" | "desc" | null;

    const result = await getListDataRows(params.id, user.id, {
      pagination: {
        limit,
        offset: page ? undefined : offset,
        page,
      },
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sort: sortField
        ? {
            field: sortField,
            order: sortOrder || "asc",
          }
        : undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Get list data error:", error);
    if (error.message === "List not found or access denied") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/lists/[id]/data
 * Create a new list data row or bulk create rows
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { data, bulk } = body;

    // Get list properties for validation
    const properties = await getListProperties(params.id, user.id);

    if (!properties) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Bulk create
    if (bulk && Array.isArray(data)) {
      // Validate each row
      for (const rowData of data) {
        const validation = validateFormData(properties, rowData);
        if (!validation.isValid) {
          return NextResponse.json(
            {
              error: "Validation failed",
              details: validation.errors,
            },
            { status: 400 }
          );
        }
      }

      const result = await bulkCreateListDataRows(params.id, user.id, data);
      return NextResponse.json(
        { message: `${result.count} rows created successfully`, count: result.count },
        { status: 201 }
      );
    }

    // Single create
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Data is required" }, { status: 400 });
    }

    // Validate form data
    const validation = validateFormData(properties, data);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const row = await createListDataRow(params.id, user.id, data);

    return NextResponse.json(
      { message: "Row created successfully", data: row },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create list data error:", error);
    if (error.message === "List not found or access denied") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
