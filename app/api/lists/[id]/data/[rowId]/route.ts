import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getListDataRowById,
  updateListDataRow,
  deleteListDataRow,
} from "@/lib/lists/queries";
import { validateFormData } from "@/lib/lists/dsl-validator";
import { getListProperties } from "@/lib/lists/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/lists/[id]/data/[rowId]
 * Get a single list data row
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; rowId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const row = await getListDataRowById(params.rowId, params.id, user.id);

    if (!row) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }

    return NextResponse.json({ data: row }, { status: 200 });
  } catch (error) {
    console.error("Get list data row error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/lists/[id]/data/[rowId]
 * Update a list data row
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; rowId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Data is required" }, { status: 400 });
    }

    // Get list properties for validation
    const properties = await getListProperties(params.id, user.id);

    if (!properties) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
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

    const row = await updateListDataRow(params.rowId, params.id, user.id, data);

    return NextResponse.json(
      { message: "Row updated successfully", data: row },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update list data row error:", error);
    if (error.message === "List not found or access denied") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/lists/[id]/data/[rowId]
 * Delete a list data row (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; rowId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteListDataRow(params.rowId, params.id, user.id);

    return NextResponse.json({ message: "Row deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Delete list data row error:", error);
    if (error.message === "List not found or access denied") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
