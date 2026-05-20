import { describe, expect, it } from "vitest";
import {
  validateFormData,
  getVisibleFields,
  getDefaultValues,
} from "./dsl-validator";
import type { ParsedField } from "./dsl-types";

function makeField(
  overrides: Partial<ParsedField> & { propertyKey: string; propertyType: string }
): ParsedField {
  return {
    propertyName: overrides.propertyKey,
    displayOrder: 0,
    isRequired: false,
    defaultValue: null,
    validationRules: null,
    helpText: null,
    placeholder: null,
    isVisible: true,
    visibilityCondition: null,
    ...overrides,
  };
}

describe("validateFormData", () => {
  it("returns valid when all required fields have values", () => {
    const fields = [
      makeField({ propertyKey: "name", propertyType: "text", isRequired: true }),
    ];
    const result = validateFormData(fields, { name: "Alice" });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns error when required field is empty string", () => {
    const fields = [
      makeField({ propertyKey: "name", propertyType: "text", isRequired: true }),
    ];
    const result = validateFormData(fields, { name: "" });
    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe("name");
  });

  it("returns error when required field is missing from formData", () => {
    const fields = [
      makeField({ propertyKey: "name", propertyType: "text", isRequired: true }),
    ];
    const result = validateFormData(fields, {});
    expect(result.isValid).toBe(false);
  });

  it("skips hidden fields that have no value", () => {
    const fields = [
      makeField({
        propertyKey: "hidden",
        propertyType: "text",
        isRequired: true,
        isVisible: false,
      }),
    ];
    expect(validateFormData(fields, {}).isValid).toBe(true);
  });

  it("validates hidden field that has a value", () => {
    const fields = [
      makeField({
        propertyKey: "hidden",
        propertyType: "text",
        isRequired: false,
        isVisible: false,
        validationRules: { minLength: 10 },
      }),
    ];
    expect(validateFormData(fields, { hidden: "short" }).isValid).toBe(false);
  });

  it("validates number below min", () => {
    const field = makeField({
      propertyKey: "age",
      propertyType: "number",
      validationRules: { min: 18, max: 99 },
    });
    expect(validateFormData([field], { age: 10 }).isValid).toBe(false);
  });

  it("validates number above max", () => {
    const field = makeField({
      propertyKey: "age",
      propertyType: "number",
      validationRules: { min: 18, max: 99 },
    });
    expect(validateFormData([field], { age: 100 }).isValid).toBe(false);
  });

  it("accepts number within range", () => {
    const field = makeField({
      propertyKey: "age",
      propertyType: "number",
      validationRules: { min: 18, max: 99 },
    });
    expect(validateFormData([field], { age: 25 }).isValid).toBe(true);
  });

  it("rejects non-numeric string as number", () => {
    const field = makeField({ propertyKey: "qty", propertyType: "number" });
    expect(validateFormData([field], { qty: "banana" }).isValid).toBe(false);
  });

  it("validates email format", () => {
    const field = makeField({ propertyKey: "email", propertyType: "email" });
    expect(validateFormData([field], { email: "not-an-email" }).isValid).toBe(false);
    expect(validateFormData([field], { email: "user@example.com" }).isValid).toBe(true);
  });

  it("validates URL format", () => {
    const field = makeField({ propertyKey: "site", propertyType: "url" });
    expect(validateFormData([field], { site: "not-a-url" }).isValid).toBe(false);
    expect(validateFormData([field], { site: "https://example.com" }).isValid).toBe(true);
  });

  it("validates select against allowed options", () => {
    const field = makeField({
      propertyKey: "tier",
      propertyType: "select",
      validationRules: { options: ["free", "pro"] },
    });
    expect(validateFormData([field], { tier: "enterprise" }).isValid).toBe(false);
    expect(validateFormData([field], { tier: "pro" }).isValid).toBe(true);
  });

  it("rejects multiselect that is not an array", () => {
    const field = makeField({
      propertyKey: "tags",
      propertyType: "multiselect",
      validationRules: { options: ["a", "b"] },
    });
    expect(validateFormData([field], { tags: "a" }).isValid).toBe(false);
  });

  it("rejects multiselect with invalid option", () => {
    const field = makeField({
      propertyKey: "tags",
      propertyType: "multiselect",
      validationRules: { options: ["a", "b"] },
    });
    expect(validateFormData([field], { tags: ["a", "z"] }).isValid).toBe(false);
  });

  it("accepts multiselect with all valid options", () => {
    const field = makeField({
      propertyKey: "tags",
      propertyType: "multiselect",
      validationRules: { options: ["a", "b"] },
    });
    expect(validateFormData([field], { tags: ["a", "b"] }).isValid).toBe(true);
  });

  it("validates text below minLength", () => {
    const field = makeField({
      propertyKey: "bio",
      propertyType: "text",
      validationRules: { minLength: 5, maxLength: 20 },
    });
    expect(validateFormData([field], { bio: "Hi" }).isValid).toBe(false);
  });

  it("validates text above maxLength", () => {
    const field = makeField({
      propertyKey: "bio",
      propertyType: "text",
      validationRules: { minLength: 5, maxLength: 20 },
    });
    expect(validateFormData([field], { bio: "This text is way too long for the limit" }).isValid).toBe(false);
  });

  it("validates text pattern mismatch", () => {
    const field = makeField({
      propertyKey: "code",
      propertyType: "text",
      validationRules: { pattern: "^[A-Z]{3}$" },
    });
    expect(validateFormData([field], { code: "abc" }).isValid).toBe(false);
    expect(validateFormData([field], { code: "ABC" }).isValid).toBe(true);
  });

  it("rejects non-boolean for boolean field", () => {
    const field = makeField({ propertyKey: "active", propertyType: "boolean" });
    expect(validateFormData([field], { active: "yes" }).isValid).toBe(false);
    expect(validateFormData([field], { active: true }).isValid).toBe(true);
  });

  it("rejects invalid date string", () => {
    const field = makeField({ propertyKey: "dob", propertyType: "date" });
    expect(validateFormData([field], { dob: "not-a-date" }).isValid).toBe(false);
    expect(validateFormData([field], { dob: "2024-01-15" }).isValid).toBe(true);
  });

  it("validates date min/max range", () => {
    const field = makeField({
      propertyKey: "due",
      propertyType: "date",
      validationRules: { min: "2024-01-01", max: "2024-12-31" },
    });
    expect(validateFormData([field], { due: "2023-06-01" }).isValid).toBe(false);
    expect(validateFormData([field], { due: "2024-06-15" }).isValid).toBe(true);
  });
});

describe("getVisibleFields / evaluateVisibilityCondition", () => {
  it("hides field when isVisible is false", () => {
    const field = makeField({
      propertyKey: "notes",
      propertyType: "text",
      isVisible: false,
    });
    expect(getVisibleFields([field], {})).toHaveLength(0);
  });

  it("shows field when isVisible is true and no condition", () => {
    const field = makeField({ propertyKey: "notes", propertyType: "text" });
    expect(getVisibleFields([field], {})).toHaveLength(1);
  });

  it("equals operator: shows field when values match", () => {
    const field = makeField({
      propertyKey: "detail",
      propertyType: "text",
      visibilityCondition: { field: "status", operator: "equals", value: "open" },
    });
    expect(getVisibleFields([field], { status: "open" })).toHaveLength(1);
    expect(getVisibleFields([field], { status: "closed" })).toHaveLength(0);
  });

  it("notEquals operator: hides field when values match", () => {
    const field = makeField({
      propertyKey: "reason",
      propertyType: "text",
      visibilityCondition: { field: "status", operator: "notEquals", value: "closed" },
    });
    expect(getVisibleFields([field], { status: "closed" })).toHaveLength(0);
    expect(getVisibleFields([field], { status: "open" })).toHaveLength(1);
  });

  it("isEmpty operator: shows field when watched value is empty", () => {
    const field = makeField({
      propertyKey: "f",
      propertyType: "text",
      visibilityCondition: { field: "x", operator: "isEmpty", value: null },
    });
    expect(getVisibleFields([field], { x: "" })).toHaveLength(1);
    expect(getVisibleFields([field], { x: [] })).toHaveLength(1);
    expect(getVisibleFields([field], { x: "something" })).toHaveLength(0);
  });

  it("isNotEmpty operator: shows field when watched value is non-empty", () => {
    const field = makeField({
      propertyKey: "f",
      propertyType: "text",
      visibilityCondition: { field: "x", operator: "isNotEmpty", value: null },
    });
    expect(getVisibleFields([field], { x: "value" })).toHaveLength(1);
    expect(getVisibleFields([field], { x: "" })).toHaveLength(0);
  });

  it("greaterThan operator", () => {
    const field = makeField({
      propertyKey: "bonus",
      propertyType: "number",
      visibilityCondition: { field: "score", operator: "greaterThan", value: 50 },
    });
    expect(getVisibleFields([field], { score: 60 })).toHaveLength(1);
    expect(getVisibleFields([field], { score: 40 })).toHaveLength(0);
  });

  it("lessThan operator", () => {
    const field = makeField({
      propertyKey: "f",
      propertyType: "number",
      visibilityCondition: { field: "val", operator: "lessThan", value: 10 },
    });
    expect(getVisibleFields([field], { val: 5 })).toHaveLength(1);
    expect(getVisibleFields([field], { val: 15 })).toHaveLength(0);
  });

  it("contains operator: works on arrays", () => {
    const field = makeField({
      propertyKey: "detail",
      propertyType: "text",
      visibilityCondition: { field: "tags", operator: "contains", value: "vip" },
    });
    expect(getVisibleFields([field], { tags: ["vip", "promo"] })).toHaveLength(1);
    expect(getVisibleFields([field], { tags: ["basic"] })).toHaveLength(0);
  });

  it("contains operator: works on strings", () => {
    const field = makeField({
      propertyKey: "detail",
      propertyType: "text",
      visibilityCondition: { field: "note", operator: "contains", value: "urgent" },
    });
    expect(getVisibleFields([field], { note: "this is urgent" })).toHaveLength(1);
    expect(getVisibleFields([field], { note: "routine task" })).toHaveLength(0);
  });

  it("notContains operator: hides when array contains value", () => {
    const field = makeField({
      propertyKey: "f",
      propertyType: "text",
      visibilityCondition: { field: "roles", operator: "notContains", value: "admin" },
    });
    expect(getVisibleFields([field], { roles: ["admin", "user"] })).toHaveLength(0);
    expect(getVisibleFields([field], { roles: ["user"] })).toHaveLength(1);
  });
});

describe("getDefaultValues", () => {
  it("returns false for boolean fields with no defaultValue", () => {
    const field = makeField({ propertyKey: "active", propertyType: "boolean" });
    expect(getDefaultValues([field]).active).toBe(false);
  });

  it("returns 0 for number fields with no defaultValue", () => {
    const field = makeField({ propertyKey: "count", propertyType: "number" });
    expect(getDefaultValues([field]).count).toBe(0);
  });

  it("returns [] for multiselect fields with no defaultValue", () => {
    const field = makeField({ propertyKey: "tags", propertyType: "multiselect" });
    expect(getDefaultValues([field]).tags).toEqual([]);
  });

  it("returns empty string for text fields with no defaultValue", () => {
    const field = makeField({ propertyKey: "name", propertyType: "text" });
    expect(getDefaultValues([field]).name).toBe("");
  });

  it("parses JSON defaultValue", () => {
    const field = makeField({
      propertyKey: "status",
      propertyType: "text",
      defaultValue: '"active"',
    });
    expect(getDefaultValues([field]).status).toBe("active");
  });

  it("parses JSON array defaultValue", () => {
    const field = makeField({
      propertyKey: "tags",
      propertyType: "multiselect",
      defaultValue: '["a","b"]',
    });
    expect(getDefaultValues([field]).tags).toEqual(["a", "b"]);
  });

  it("falls back to raw string when defaultValue is not valid JSON", () => {
    const field = makeField({
      propertyKey: "code",
      propertyType: "text",
      defaultValue: "not-json",
    });
    expect(getDefaultValues([field]).code).toBe("not-json");
  });
});