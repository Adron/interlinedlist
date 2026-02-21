/**
 * Date utility functions for handling date/datetime fields
 */

/**
 * Formats a Date to local-time string for input fields.
 * Uses local time components (not UTC) so datetime-local displays correctly.
 */
function formatDateToLocal(date: Date, type: "date" | "datetime"): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (type === "date") {
    return `${y}-${m}-${d}`;
  }
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

/**
 * Formats a date value for input fields (local time for datetime-local)
 */
export function formatDateForInput(
  date: Date | string | null | undefined,
  type: "date" | "datetime"
): string {
  if (!date) {
    return "";
  }

  let d: Date;
  if (typeof date === "string") {
    d = new Date(date.replace(" ", "T"));
    if (isNaN(d.getTime())) return "";
    return formatDateToLocal(d, type);
  }

  if (date instanceof Date) {
    if (isNaN(date.getTime())) return "";
    return formatDateToLocal(date, type);
  }

  return "";
}

/**
 * Parses a date string from input to Date object
 */
export function parseDateFromInput(
  value: string,
  type: "date" | "datetime"
): Date | null {
  if (!value || value.trim() === "") {
    return null;
  }

  // For date type, ensure we have YYYY-MM-DD format
  if (type === "date") {
    const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const date = new Date(value + "T00:00:00");
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  // For datetime type, accept YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm
  if (type === "datetime") {
    const normalized = value.replace(" ", "T");
    const datetimeMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (datetimeMatch) {
      const date = new Date(normalized);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  return null;
}

/**
 * Parses a date string flexibly (e.g. 2/20/2024, Feb 20 2024) and returns canonical format.
 * Use when normalizing values from API, clipboard, or other sources.
 * Returns local-time format for datetime-local input compatibility.
 */
export function parseDateFlexible(
  value: string,
  type: "date" | "datetime"
): string | null {
  if (!value || value.trim() === "") {
    return null;
  }

  const trimmed = value.trim();
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  return formatDateToLocal(parsed, type);
}

/**
 * Validates if a date string is in the correct format
 */
export function isValidDateString(
  value: string,
  type: "date" | "datetime"
): boolean {
  if (!value || value.trim() === "") {
    return false;
  }

  if (type === "date") {
    // Check for YYYY-MM-DD format (allowing partial dates like YYYY-MM)
    const datePattern = /^\d{4}(-\d{2}(-\d{2})?)?$/;
    return datePattern.test(value);
  } else {
    // Check for YYYY-MM-DDTHH:mm format (allowing partial)
    const datetimePattern = /^\d{4}(-\d{2}(-\d{2}(T\d{2}(:\d{2})?)?)?)?$/;
    return datetimePattern.test(value);
  }
}
