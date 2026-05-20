import { describe, expect, it } from "vitest";
import {
  formatDateForInput,
  parseDateFromInput,
  parseDateFlexible,
  isValidDateString,
} from "./date-utils";

describe("formatDateForInput", () => {
  it("returns empty string for null", () => {
    expect(formatDateForInput(null, "date")).toBe("");
    expect(formatDateForInput(null, "datetime")).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDateForInput(undefined, "date")).toBe("");
  });

  it("returns empty string for an invalid date string", () => {
    expect(formatDateForInput("not-a-date", "date")).toBe("");
  });

  it("returns empty string for an invalid Date object", () => {
    expect(formatDateForInput(new Date("invalid"), "date")).toBe("");
  });

  it("formats a date string to YYYY-MM-DD for date type", () => {
    const result = formatDateForInput("2024-06-15T00:00:00", "date");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("formats a datetime string to YYYY-MM-DDTHH:mm for datetime type", () => {
    const result = formatDateForInput("2024-06-15T14:30:00", "datetime");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("accepts a Date object and produces the correct date format", () => {
    const d = new Date(2024, 5, 15); // June 15, 2024 in local time
    const result = formatDateForInput(d, "date");
    expect(result).toBe("2024-06-15");
  });

  it("accepts a Date object and produces the correct datetime format", () => {
    const d = new Date(2024, 5, 15, 9, 5); // June 15 09:05 local time
    const result = formatDateForInput(d, "datetime");
    expect(result).toBe("2024-06-15T09:05");
  });

  it("date type result does not include time component", () => {
    const result = formatDateForInput(new Date(2024, 0, 1, 23, 59), "date");
    expect(result).not.toContain("T");
    expect(result).not.toContain(":");
  });
});

describe("parseDateFromInput", () => {
  it("returns null for an empty string", () => {
    expect(parseDateFromInput("", "date")).toBeNull();
  });

  it("returns null for a whitespace-only string", () => {
    expect(parseDateFromInput("  ", "date")).toBeNull();
  });

  it("parses YYYY-MM-DD for date type", () => {
    const result = parseDateFromInput("2024-06-15", "date");
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2024);
  });

  it("returns null for date string in wrong format (DD/MM/YYYY)", () => {
    expect(parseDateFromInput("15/06/2024", "date")).toBeNull();
  });

  it("returns null for a completely invalid date string", () => {
    expect(parseDateFromInput("not-a-date", "date")).toBeNull();
  });

  it("parses YYYY-MM-DDTHH:mm for datetime type", () => {
    const result = parseDateFromInput("2024-06-15T14:30", "datetime");
    expect(result).toBeInstanceOf(Date);
  });

  it("parses space-separated datetime (YYYY-MM-DD HH:mm)", () => {
    const result = parseDateFromInput("2024-06-15 14:30", "datetime");
    expect(result).toBeInstanceOf(Date);
  });

  it("returns null for an invalid datetime string", () => {
    expect(parseDateFromInput("notadate", "datetime")).toBeNull();
  });

  it("returns null for datetime without time component matching the pattern", () => {
    // "2024-06-15" for datetime type doesn't match /YYYY-MM-DDTHH:mm/
    expect(parseDateFromInput("2024-06-15", "datetime")).toBeNull();
  });
});

describe("parseDateFlexible", () => {
  it("returns null for empty string", () => {
    expect(parseDateFlexible("", "date")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseDateFlexible("  ", "date")).toBeNull();
  });

  it("returns null for an unparseable string", () => {
    expect(parseDateFlexible("gibberish-xyz", "date")).toBeNull();
  });

  it("parses a human-readable date and returns YYYY-MM-DD format", () => {
    const result = parseDateFlexible("June 15, 2024", "date");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("parses an ISO date string", () => {
    const result = parseDateFlexible("2024-06-15", "date");
    expect(result).toMatch(/^2024-06-\d{2}$/);
  });

  it("returns a string (not a Date object)", () => {
    const result = parseDateFlexible("2024-01-01", "date");
    expect(typeof result).toBe("string");
  });
});

describe("isValidDateString", () => {
  it("returns false for empty string", () => {
    expect(isValidDateString("", "date")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(isValidDateString("  ", "date")).toBe(false);
  });

  it("returns true for YYYY-MM-DD format", () => {
    expect(isValidDateString("2024-06-15", "date")).toBe(true);
  });

  it("returns true for partial date YYYY-MM", () => {
    expect(isValidDateString("2024-06", "date")).toBe(true);
  });

  it("returns true for year-only YYYY", () => {
    expect(isValidDateString("2024", "date")).toBe(true);
  });

  it("returns false for wrong format DD/MM/YYYY", () => {
    expect(isValidDateString("15/06/2024", "date")).toBe(false);
  });

  it("returns false for non-numeric date", () => {
    expect(isValidDateString("June 15 2024", "date")).toBe(false);
  });

  it("returns true for full datetime YYYY-MM-DDTHH:mm", () => {
    expect(isValidDateString("2024-06-15T14:30", "datetime")).toBe(true);
  });

  it("returns true for partial datetime YYYY-MM-DD", () => {
    expect(isValidDateString("2024-06-15", "datetime")).toBe(true);
  });

  it("returns false for datetime with wrong separator", () => {
    expect(isValidDateString("2024-06-15 14:30", "datetime")).toBe(false);
  });
});