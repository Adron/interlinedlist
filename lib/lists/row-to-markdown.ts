import { ParsedField } from "./dsl-types";
import { formatListCellDisplay } from "./row-value-display";

function sanitizeHeadingText(name: string): string {
  return name.replace(/\r?\n/g, " ").replace(/^#+\s*/, "").trim() || "Field";
}

function needsFence(display: string): boolean {
  if (!display) return false;
  return /[\r\n]/.test(display) || /^#+\s/m.test(display) || /```/.test(display);
}

function formatValueBlock(display: string): string {
  if (display === "") {
    return "_—_";
  }
  if (needsFence(display)) {
    return ["```", display.replace(/\r\n/g, "\n"), "```"].join("\n");
  }
  return display;
}

export interface BuildRowMarkdownOptions {
  listTitle: string;
  fields: ParsedField[];
  rowData: Record<string, unknown>;
}

/**
 * Markdown document body: H1 list title, then ## per column in field order.
 */
export function buildRowMarkdownMarkdown(options: BuildRowMarkdownOptions): string {
  const { listTitle, fields, rowData } = options;
  const titleLine = sanitizeHeadingText(listTitle);
  const lines: string[] = [`# ${titleLine}`, ""];
  for (const field of fields) {
    lines.push(`## ${sanitizeHeadingText(field.propertyName)}`, "");
    const display = formatListCellDisplay(field, rowData[field.propertyKey]);
    lines.push(formatValueBlock(display), "");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export function slugifyForPath(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "list";
}

export function buildExportDocumentPaths(listTitle: string, rowId: string): { title: string; relativePath: string } {
  const slug = slugifyForPath(listTitle);
  const shortId = rowId.slice(0, 8);
  const relativePath = `${slug}-${shortId}.md`;
  const title =
    listTitle.length > 120 ? `${listTitle.slice(0, 117)}…` : `${listTitle} (row)`;
  return { title, relativePath };
}
