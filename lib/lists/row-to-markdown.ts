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

export interface BuildListMarkdownOptions {
  listTitle: string;
  fields: ParsedField[];
  rows: Array<Record<string, unknown>>;
  listStyle: "numbered" | "bulleted";
  rowDataStyle: "inline" | "sub-items";
  truncated?: boolean;
  totalRows?: number;
}

function inlineValue(display: string): string {
  return display.replace(/[\r\n]+/g, " ").trim() || "—";
}

/**
 * Builds a full-list markdown document with configurable list and row-data styles.
 *
 * listStyle:    'numbered'  → 1. 2. 3.   |  'bulleted' → - - -
 * rowDataStyle: 'inline'    → comma-delimited values on one line
 *               'sub-items' → first field as parent label, remaining as key: value sub-items
 */
export function buildListMarkdown(options: BuildListMarkdownOptions): string {
  const { listTitle, fields, rows, listStyle, rowDataStyle, truncated, totalRows } = options;
  const titleLine = sanitizeHeadingText(listTitle);
  const lines: string[] = [`# ${titleLine}`, ""];

  if (truncated && totalRows !== undefined) {
    lines.push(`> ⚠ Showing first ${rows.length} of ${totalRows} rows.`, "");
  }

  if (rows.length === 0) {
    lines.push("_No rows._");
    return lines.join("\n").trimEnd() + "\n";
  }

  if (rowDataStyle === "inline") {
    lines.push(`**${fields.map((f) => sanitizeHeadingText(f.propertyName)).join(", ")}**`, "");
    rows.forEach((rowData, idx) => {
      const values = fields.map((f) =>
        inlineValue(formatListCellDisplay(f, rowData[f.propertyKey]))
      );
      const prefix = listStyle === "numbered" ? `${idx + 1}.` : "-";
      lines.push(`${prefix} ${values.join(", ")}`);
    });
    lines.push("");
  } else {
    rows.forEach((rowData, idx) => {
      const firstField = fields[0];
      const label = firstField
        ? inlineValue(formatListCellDisplay(firstField, rowData[firstField.propertyKey])) ||
          `Row ${idx + 1}`
        : `Row ${idx + 1}`;
      const prefix = listStyle === "numbered" ? `${idx + 1}.` : "-";
      lines.push(`${prefix} ${label}`);

      const subFields = fields.slice(1);
      if (listStyle === "numbered") {
        subFields.forEach((field, subIdx) => {
          const display = inlineValue(formatListCellDisplay(field, rowData[field.propertyKey]));
          lines.push(`   ${subIdx + 1}. ${sanitizeHeadingText(field.propertyName)}: ${display}`);
        });
      } else {
        subFields.forEach((field) => {
          const display = inlineValue(formatListCellDisplay(field, rowData[field.propertyKey]));
          lines.push(`  - ${sanitizeHeadingText(field.propertyName)}: ${display}`);
        });
      }
      lines.push("");
    });
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function buildListDocumentPaths(
  listTitle: string,
  listId: string
): { title: string; relativePath: string } {
  const slug = slugifyForPath(listTitle);
  const shortId = listId.slice(0, 8);
  const relativePath = `${slug}-list-${shortId}.md`;
  const title = listTitle.length > 120 ? `${listTitle.slice(0, 117)}…` : listTitle;
  return { title, relativePath };
}
