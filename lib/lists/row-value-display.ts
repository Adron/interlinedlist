import { ParsedField } from "./dsl-types";

/**
 * String shown in list table cells (matches ListDataTable display).
 */
export function formatListCellDisplay(field: ParsedField, value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  switch (field.propertyType) {
    case "boolean":
      return value ? "Yes" : "No";
    case "date":
      if (typeof value === "string" || value instanceof Date) {
        const d = value instanceof Date ? value : new Date(value);
        return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
      }
      return String(value);
    case "datetime":
      if (typeof value === "string" || value instanceof Date) {
        const d = value instanceof Date ? value : new Date(value);
        return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
      }
      return String(value);
    case "multiselect":
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      return String(value);
    default:
      return String(value);
  }
}
