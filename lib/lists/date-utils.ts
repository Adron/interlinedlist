/**
 * Date utility functions for handling date/datetime fields
 */

/**
 * Formats a date value for input fields (ISO format strings)
 */
export function formatDateForInput(
  date: Date | string | null | undefined,
  type: "date" | "datetime"
): string {
  if (!date) {
    return "";
  }

  if (typeof date === "string") {
    // If it's already a string, validate it's in the right format
    if (type === "date") {
      // Should be YYYY-MM-DD
      return date;
    } else {
      // Should be YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
      return date.slice(0, 16);
    }
  }

  if (date instanceof Date) {
    if (isNaN(date.getTime())) {
      return "";
    }
    if (type === "date") {
      return date.toISOString().split("T")[0];
    } else {
      return date.toISOString().slice(0, 16);
    }
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

  // For datetime type, ensure we have YYYY-MM-DDTHH:mm format
  if (type === "datetime") {
    const datetimeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (datetimeMatch) {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  return null;
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
