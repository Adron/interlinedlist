import { describe, expect, it } from "vitest";
import { formatListCellDisplay } from "./row-value-display";
import type { ParsedField } from "./dsl-types";

function field(type: string): ParsedField {
  return {
    propertyKey: "f",
    propertyName: "F",
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

describe("formatListCellDisplay", () => {
  it("returns empty string for null value", () => {
    expect(formatListCellDisplay(field("text"), null)).toBe("");
  });

  it("returns empty string for undefined value", () => {
    expect(formatListCellDisplay(field("text"), undefined)).toBe("");
  });

  it("formats boolean true as 'Yes'", () => {
    expect(formatListCellDisplay(field("boolean"), true)).toBe("Yes");
  });

  it("formats boolean false as 'No'", () => {
    expect(formatListCellDisplay(field("boolean"), false)).toBe("No");
  });

  it("formats a valid date string as a locale date string", () => {
    const result = formatListCellDisplay(field("date"), "2024-06-15T12:00:00");
    // Should be locale-formatted, not the raw ISO string
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("returns the raw string for an invalid date value", () => {
    expect(formatListCellDisplay(field("date"), "not-a-date")).toBe("not-a-date");
  });

  it("formats a Date object for the date field type", () => {
    const d = new Date(2024, 5, 15); // June 15 in local time
    const result = formatListCellDisplay(field("date"), d);
    expect(result).toBeTruthy();
  });

  it("formats a valid datetime string as a locale string", () => {
    const result = formatListCellDisplay(field("datetime"), "2024-06-15T14:30:00");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("returns raw string for invalid datetime value", () => {
    expect(formatListCellDisplay(field("datetime"), "garbage")).toBe("garbage");
  });

  it("joins a multiselect array with ', '", () => {
    expect(formatListCellDisplay(field("multiselect"), ["a", "b", "c"])).toBe("a, b, c");
  });

  it("returns empty string for an empty multiselect array", () => {
    expect(formatListCellDisplay(field("multiselect"), [])).toBe("");
  });

  it("returns a string representation for a non-array multiselect value", () => {
    // Non-array falls through to String(value)
    expect(formatListCellDisplay(field("multiselect"), "single")).toBe("single");
  });

  it("uppercases priority values", () => {
    expect(formatListCellDisplay(field("priority"), "high")).toBe("HIGH");
    expect(formatListCellDisplay(field("priority"), "low")).toBe("LOW");
    expect(formatListCellDisplay(field("priority"), "urgent")).toBe("URGENT");
    expect(formatListCellDisplay(field("priority"), "medium")).toBe("MEDIUM");
  });

  it("converts text field value to string", () => {
    expect(formatListCellDisplay(field("text"), "hello")).toBe("hello");
  });

  it("converts number field value to string", () => {
    expect(formatListCellDisplay(field("number"), 42)).toBe("42");
  });

  it("converts boolean-like non-boolean values via String for unknown types", () => {
    expect(formatListCellDisplay(field("tel"), 555_123_4567)).toBe("5551234567");
  });
});
