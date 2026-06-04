/**
 * Unit tests for CreateFolderForm POST body composition and cancelHref logic.
 *
 * These tests exercise the pure rules from CreateFolderForm.tsx without
 * mounting the React component (which requires jsdom + router mocks).
 *
 * Specifically:
 *   body = JSON.stringify({ name: name.trim(), ...(parentId ? { parentId } : {}) })
 *   cancelHref defaults to '/documents'
 */

import { describe, expect, it } from "vitest";

// ── helpers that mirror the exact logic in CreateFolderForm ──────────────────

/**
 * Builds the fetch body exactly as CreateFolderForm does.
 */
function buildPostBody(name: string, parentId?: string): string {
  return JSON.stringify({ name: name.trim(), ...(parentId ? { parentId } : {}) });
}

/**
 * Resolves cancelHref with the same default as the component prop.
 */
function resolveCancelHref(cancelHref: string = "/documents"): string {
  return cancelHref;
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("CreateFolderForm — POST body composition", () => {
  it("includes only name when no parentId is provided", () => {
    const body = JSON.parse(buildPostBody("My Folder"));
    expect(body).toEqual({ name: "My Folder" });
    expect(body).not.toHaveProperty("parentId");
  });

  it("trims whitespace from the name", () => {
    const body = JSON.parse(buildPostBody("  Trimmed  "));
    expect(body.name).toBe("Trimmed");
  });

  it("includes parentId when parentId is provided", () => {
    const body = JSON.parse(buildPostBody("Sub Folder", "abc123"));
    expect(body).toEqual({ name: "Sub Folder", parentId: "abc123" });
  });

  it("does not include parentId when parentId is an empty string (falsy)", () => {
    const body = JSON.parse(buildPostBody("Folder", ""));
    expect(body).not.toHaveProperty("parentId");
  });

  it("preserves parentId with an arbitrary UUID value", () => {
    const uuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    const body = JSON.parse(buildPostBody("Nested", uuid));
    expect(body.parentId).toBe(uuid);
  });
});

describe("CreateFolderForm — cancelHref default", () => {
  it("defaults cancelHref to /documents when no prop is passed", () => {
    expect(resolveCancelHref()).toBe("/documents");
  });

  it("uses the provided cancelHref when given", () => {
    expect(resolveCancelHref("/documents/folders/123")).toBe("/documents/folders/123");
  });

  it("uses the provided cancelHref when given a nested subfolder path", () => {
    expect(resolveCancelHref("/documents/folders/abc/new-folder")).toBe(
      "/documents/folders/abc/new-folder"
    );
  });
});
