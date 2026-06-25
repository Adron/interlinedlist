import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const SPEC_PATH = path.join(process.cwd(), "docs", "openapi.json");

/**
 * GET /api/openapi.json
 * Serves the generated OpenAPI 3.1 specification that backs the Swagger UI page
 * at /api-docs. The spec file is produced by `npm run docs:openapi`
 * (scripts/generate-docs.js --perspective openapi) and committed under docs/.
 *
 * Public — the API surface is documentation, not a secret.
 */
export async function GET() {
  if (!fs.existsSync(SPEC_PATH)) {
    return NextResponse.json(
      { error: "OpenAPI spec not found. Run `npm run docs:openapi` to generate it." },
      { status: 404 }
    );
  }

  try {
    const raw = fs.readFileSync(SPEC_PATH, "utf8");
    // Parse to guarantee we never serve a malformed document.
    const spec = JSON.parse(raw);
    return NextResponse.json(spec, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Failed to read OpenAPI spec:", error);
    return NextResponse.json(
      { error: "OpenAPI spec is invalid JSON." },
      { status: 500 }
    );
  }
}
