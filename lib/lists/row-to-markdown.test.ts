import { describe, expect, it } from "vitest";
import {
  buildRowMarkdownMarkdown,
  buildListMarkdown,
  slugifyForPath,
  buildExportDocumentPaths,
  buildListDocumentPaths,
} from "./row-to-markdown";
import type { ParsedField } from "./dsl-types";

function makeField(key: string, type = "text", name?: string): ParsedField {
  return {
    propertyKey: key,
    propertyName: name ?? key,
    propertyType: type,
    displayOrder: 0,
    isRequired: false,
    defaultValue: null,
    validationRules: null,
    helpText: null,
    placeholder: null,
    isVisible: true,
    visibilityCondition: null,
  };
}

describe("buildRowMarkdownMarkdown", () => {
  it("produces H1 for list title and H2 for each field", () => {
    const result = buildRowMarkdownMarkdown({
      listTitle: "My List",
      fields: [makeField("name", "text", "Name")],
      rowData: { name: "Alice" },
    });
    expect(result).toContain("# My List");
    expect(result).toContain("## Name");
    expect(result).toContain("Alice");
  });

  it("renders null/undefined field value as _—_", () => {
    const result = buildRowMarkdownMarkdown({
      listTitle: "L",
      fields: [makeField("x")],
      rowData: { x: null },
    });
    expect(result).toContain("_—_");
  });

  it("renders missing key as _—_", () => {
    const result = buildRowMarkdownMarkdown({
      listTitle: "L",
      fields: [makeField("missing")],
      rowData: {},
    });
    expect(result).toContain("_—_");
  });

  it("wraps multiline values in a code fence", () => {
    const result = buildRowMarkdownMarkdown({
      listTitle: "L",
      fields: [makeField("notes")],
      rowData: { notes: "line1\nline2" },
    });
    expect(result).toContain("```");
    expect(result).toContain("line1\nline2");
  });

  it("strips leading # from title to prevent double-heading", () => {
    const result = buildRowMarkdownMarkdown({
      listTitle: "# Pre-existing Heading",
      fields: [],
      rowData: {},
    });
    // The sanitised title should appear as H1, not double-hash
    expect(result).toContain("# Pre-existing Heading");
    expect(result).not.toContain("## Pre-existing Heading");
  });

  it("produces output ending with a single newline", () => {
    const result = buildRowMarkdownMarkdown({
      listTitle: "T",
      fields: [],
      rowData: {},
    });
    expect(result.endsWith("\n")).toBe(true);
    expect(result.endsWith("\n\n")).toBe(false);
  });

  it("renders empty fields list as just the title", () => {
    const result = buildRowMarkdownMarkdown({
      listTitle: "Empty",
      fields: [],
      rowData: {},
    });
    expect(result.trim()).toBe("# Empty");
  });
});

describe("slugifyForPath", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugifyForPath("My Cool List")).toBe("my-cool-list");
  });

  it("removes special characters", () => {
    expect(slugifyForPath("Hello, World!")).toBe("hello-world");
  });

  it("collapses multiple consecutive hyphens", () => {
    expect(slugifyForPath("a--b---c")).toBe("a-b-c");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugifyForPath("--name--")).toBe("name");
  });

  it("returns 'list' for empty string", () => {
    expect(slugifyForPath("")).toBe("list");
  });

  it("returns 'list' for whitespace-only string", () => {
    expect(slugifyForPath("   ")).toBe("list");
  });

  it("returns 'list' for string containing only special characters", () => {
    expect(slugifyForPath("!!!")).toBe("list");
  });

  it("preserves hyphens and underscores", () => {
    expect(slugifyForPath("my-list_name")).toBe("my-list_name");
  });
});

describe("buildExportDocumentPaths", () => {
  it("builds relative path from slugified title and first 8 chars of rowId", () => {
    const { relativePath } = buildExportDocumentPaths("My List", "abcdef1234567890");
    expect(relativePath).toBe("my-list-abcdef12.md");
  });

  it("appends (row) suffix for titles under 120 chars", () => {
    const { title } = buildExportDocumentPaths("My List", "abc");
    expect(title).toBe("My List (row)");
  });

  it("truncates title to 117 chars + ellipsis when over 120 chars", () => {
    const longTitle = "A".repeat(130);
    const { title } = buildExportDocumentPaths(longTitle, "abc");
    expect(title).toContain("…");
    expect(title.length).toBeLessThan(130);
  });
});

describe("buildListMarkdown", () => {
  const fields = [
    makeField("name", "text", "Name"),
    makeField("age", "number", "Age"),
  ];
  const rows = [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
  ];

  it("renders _No rows._ when rows array is empty", () => {
    const result = buildListMarkdown({
      listTitle: "L",
      fields,
      rows: [],
      listStyle: "bulleted",
      rowDataStyle: "inline",
    });
    expect(result).toContain("_No rows._");
  });

  it("renders numbered list style with 1. prefix", () => {
    const result = buildListMarkdown({
      listTitle: "L",
      fields,
      rows,
      listStyle: "numbered",
      rowDataStyle: "inline",
    });
    expect(result).toContain("1.");
    expect(result).toContain("2.");
  });

  it("renders bulleted list style with - prefix", () => {
    const result = buildListMarkdown({
      listTitle: "L",
      fields,
      rows,
      listStyle: "bulleted",
      rowDataStyle: "inline",
    });
    expect(result).toMatch(/^- /m);
  });

  it("inline style includes column header line", () => {
    const result = buildListMarkdown({
      listTitle: "L",
      fields,
      rows,
      listStyle: "bulleted",
      rowDataStyle: "inline",
    });
    expect(result).toContain("**Name, Age**");
  });

  it("sub-items style shows subsequent fields as indented items", () => {
    const result = buildListMarkdown({
      listTitle: "L",
      fields,
      rows,
      listStyle: "bulleted",
      rowDataStyle: "sub-items",
    });
    expect(result).toContain("Age:");
  });

  it("shows truncation warning when truncated flag is true", () => {
    const result = buildListMarkdown({
      listTitle: "L",
      fields,
      rows,
      listStyle: "bulleted",
      rowDataStyle: "inline",
      truncated: true,
      totalRows: 100,
    });
    expect(result).toContain("⚠");
    expect(result).toContain("100");
    expect(result).toContain(String(rows.length));
  });

  it("does not show truncation warning when truncated is false", () => {
    const result = buildListMarkdown({
      listTitle: "L",
      fields,
      rows,
      listStyle: "bulleted",
      rowDataStyle: "inline",
      truncated: false,
      totalRows: 100,
    });
    expect(result).not.toContain("⚠");
  });

  it("includes the list title as H1", () => {
    const result = buildListMarkdown({
      listTitle: "My Project",
      fields,
      rows,
      listStyle: "bulleted",
      rowDataStyle: "inline",
    });
    expect(result).toContain("# My Project");
  });

  it("output ends with a single newline", () => {
    const result = buildListMarkdown({
      listTitle: "T",
      fields,
      rows,
      listStyle: "bulleted",
      rowDataStyle: "inline",
    });
    expect(result.endsWith("\n")).toBe(true);
  });
});

describe("buildListDocumentPaths", () => {
  it("builds relative path with -list- segment and first 8 chars of listId", () => {
    const { relativePath } = buildListDocumentPaths("My List", "abcdef1234567890");
    expect(relativePath).toBe("my-list-list-abcdef12.md");
  });

  it("uses the list title as-is for titles under 120 chars", () => {
    const { title } = buildListDocumentPaths("Short Title", "abc");
    expect(title).toBe("Short Title");
  });

  it("truncates long list titles to 117 chars + ellipsis", () => {
    const longTitle = "B".repeat(130);
    const { title } = buildListDocumentPaths(longTitle, "abc");
    expect(title).toContain("…");
    expect(title.length).toBeLessThan(130);
  });
});
