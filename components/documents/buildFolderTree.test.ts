/**
 * Unit tests for buildFolderTree — the pure tree-building function extracted
 * from components/documents/FolderTree.tsx.
 *
 * The function is inlined here to keep tests runnable in the plain node
 * environment without any React/Next.js module overhead.
 */

import { describe, expect, it } from "vitest";

// ── types ────────────────────────────────────────────────────────────────────

interface FolderFlat {
  id: string;
  name: string;
  parentId: string | null;
  documents: { id: string; title: string; relativePath: string }[];
}

interface Folder extends FolderFlat {
  children: Folder[];
}

// ── function under test (mirrors the source in FolderTree.tsx exactly) ──────

function buildFolderTree(flat: FolderFlat[]): Folder[] {
  const map = new Map<string, Folder>();
  flat.forEach((f) => map.set(f.id, { ...f, children: [] }));
  const roots: Folder[] = [];
  flat.forEach((f) => {
    if (f.parentId) {
      map.get(f.parentId)?.children.push(map.get(f.id)!);
    } else {
      roots.push(map.get(f.id)!);
    }
  });
  return roots;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function makeFolder(
  id: string,
  name: string,
  parentId: string | null = null,
  documents: FolderFlat["documents"] = []
): FolderFlat {
  return { id, name, parentId, documents };
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("buildFolderTree", () => {
  it("returns an empty array for an empty input", () => {
    expect(buildFolderTree([])).toEqual([]);
  });

  it("returns a single root folder with no children when given one item without parentId", () => {
    const result = buildFolderTree([makeFolder("1", "Root")]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
    expect(result[0].name).toBe("Root");
    expect(result[0].children).toEqual([]);
  });

  it("returns two root folders when both items have no parentId", () => {
    const result = buildFolderTree([
      makeFolder("1", "Alpha"),
      makeFolder("2", "Beta"),
    ]);
    expect(result).toHaveLength(2);
    const ids = result.map((r) => r.id);
    expect(ids).toContain("1");
    expect(ids).toContain("2");
    result.forEach((r) => expect(r.children).toEqual([]));
  });

  it("nests a child under its root parent", () => {
    const flat: FolderFlat[] = [
      makeFolder("root", "Root"),
      makeFolder("child", "Child", "root"),
    ];
    const result = buildFolderTree(flat);
    expect(result).toHaveLength(1);
    const root = result[0];
    expect(root.id).toBe("root");
    expect(root.children).toHaveLength(1);
    expect(root.children[0].id).toBe("child");
    expect(root.children[0].children).toEqual([]);
  });

  it("builds a three-level-deep tree correctly (root → child → grandchild)", () => {
    const flat: FolderFlat[] = [
      makeFolder("root", "Root"),
      makeFolder("child", "Child", "root"),
      makeFolder("grand", "Grandchild", "child"),
    ];
    const result = buildFolderTree(flat);
    expect(result).toHaveLength(1);
    const root = result[0];
    expect(root.children).toHaveLength(1);
    const child = root.children[0];
    expect(child.id).toBe("child");
    expect(child.children).toHaveLength(1);
    const grand = child.children[0];
    expect(grand.id).toBe("grand");
    expect(grand.children).toEqual([]);
  });

  it("does not crash and silently drops an orphan (parentId points to non-existent folder)", () => {
    const flat: FolderFlat[] = [
      makeFolder("root", "Root"),
      makeFolder("orphan", "Orphan", "does-not-exist"),
    ];
    // Should not throw
    const result = buildFolderTree(flat);
    // Root is present
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("root");
    // Orphan is not in the tree (its parent doesn't exist)
    expect(result[0].children).toEqual([]);
  });

  it("preserves documents on each node", () => {
    const docs = [
      { id: "d1", title: "Doc One", relativePath: "doc-one.md" },
      { id: "d2", title: "Doc Two", relativePath: "doc-two.md" },
    ];
    const childDocs = [{ id: "d3", title: "Child Doc", relativePath: "child.md" }];
    const flat: FolderFlat[] = [
      makeFolder("root", "Root", null, docs),
      makeFolder("child", "Child", "root", childDocs),
    ];
    const result = buildFolderTree(flat);
    const root = result[0];
    expect(root.documents).toEqual(docs);
    expect(root.children[0].documents).toEqual(childDocs);
  });

  it("handles multiple children under the same parent", () => {
    const flat: FolderFlat[] = [
      makeFolder("root", "Root"),
      makeFolder("c1", "Child One", "root"),
      makeFolder("c2", "Child Two", "root"),
      makeFolder("c3", "Child Three", "root"),
    ];
    const result = buildFolderTree(flat);
    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(3);
    const childIds = result[0].children.map((c) => c.id);
    expect(childIds).toContain("c1");
    expect(childIds).toContain("c2");
    expect(childIds).toContain("c3");
  });

  it("handles multiple root folders each with their own subtrees", () => {
    const flat: FolderFlat[] = [
      makeFolder("r1", "Root One"),
      makeFolder("r2", "Root Two"),
      makeFolder("c1", "Child of R1", "r1"),
      makeFolder("c2", "Child of R2", "r2"),
    ];
    const result = buildFolderTree(flat);
    expect(result).toHaveLength(2);
    const r1 = result.find((r) => r.id === "r1")!;
    const r2 = result.find((r) => r.id === "r2")!;
    expect(r1.children).toHaveLength(1);
    expect(r1.children[0].id).toBe("c1");
    expect(r2.children).toHaveLength(1);
    expect(r2.children[0].id).toBe("c2");
  });
});
