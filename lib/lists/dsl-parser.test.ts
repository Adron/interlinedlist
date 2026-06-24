import { describe, expect, it } from "vitest";
import { validateDSLSchema, parseDSLSchema, parsedSchemaToDSL } from "./dsl-parser";
import type { DSLSchema } from "./dsl-types";

const minimalDSL: DSLSchema = {
  name: "Test List",
  fields: [{ key: "name", type: "text", label: "Name" }],
};

describe("validateDSLSchema", () => {
  it("accepts a valid schema", () => {
    const result = validateDSLSchema(minimalDSL);
    expect(result.name).toBe("Test List");
    expect(result.fields).toHaveLength(1);
  });

  it("accepts optional description", () => {
    const result = validateDSLSchema({ ...minimalDSL, description: "A test list" });
    expect(result.description).toBe("A test list");
  });

  it("throws when dsl is null", () => {
    expect(() => validateDSLSchema(null)).toThrow("DSL must be an object");
  });

  it("throws when dsl is a string", () => {
    expect(() => validateDSLSchema("not an object")).toThrow("DSL must be an object");
  });

  it("throws when name property is missing", () => {
    expect(() =>
      validateDSLSchema({ fields: [{ key: "k", type: "text", label: "K" }] })
    ).toThrow(/name/);
  });

  it("throws when name is not a string", () => {
    expect(() =>
      validateDSLSchema({ name: 42, fields: [{ key: "k", type: "text", label: "K" }] })
    ).toThrow(/name/);
  });

  it("throws when fields property is missing", () => {
    expect(() => validateDSLSchema({ name: "X" })).toThrow(/fields/);
  });

  it("throws when fields is not an array", () => {
    expect(() => validateDSLSchema({ name: "X", fields: "bad" })).toThrow(/fields/);
  });

  it("throws when fields array is empty", () => {
    expect(() => validateDSLSchema({ name: "X", fields: [] })).toThrow(/at least one/);
  });

  it("throws when field has invalid type", () => {
    expect(() =>
      validateDSLSchema({ name: "X", fields: [{ key: "f", type: "invalid", label: "F" }] })
    ).toThrow(/invalid type/);
  });

  it("throws when field is missing key", () => {
    expect(() =>
      validateDSLSchema({ name: "X", fields: [{ type: "text", label: "F" }] })
    ).toThrow(/'key'/);
  });

  it("throws when field key is not a string", () => {
    expect(() =>
      validateDSLSchema({ name: "X", fields: [{ key: 42, type: "text", label: "F" }] })
    ).toThrow(/'key'/);
  });

  it("throws when field is missing label", () => {
    expect(() =>
      validateDSLSchema({ name: "X", fields: [{ key: "f", type: "text" }] })
    ).toThrow(/'label'/);
  });

  it("throws when select field has no options", () => {
    expect(() =>
      validateDSLSchema({ name: "X", fields: [{ key: "tier", type: "select", label: "Tier" }] })
    ).toThrow(/options/);
  });

  it("throws when multiselect field has no options", () => {
    expect(() =>
      validateDSLSchema({ name: "X", fields: [{ key: "tags", type: "multiselect", label: "Tags" }] })
    ).toThrow(/options/);
  });

  it("throws when options is not an array", () => {
    expect(() =>
      validateDSLSchema({
        name: "X",
        fields: [{ key: "tier", type: "select", label: "Tier", options: "free,pro" }],
      })
    ).toThrow(/options must be an array/);
  });

  it("throws on duplicate field keys", () => {
    expect(() =>
      validateDSLSchema({
        name: "X",
        fields: [
          { key: "name", type: "text", label: "Name" },
          { key: "name", type: "text", label: "Name Again" },
        ],
      })
    ).toThrow(/Duplicate/);
  });

  it("accepts all valid field types", () => {
    const types = ["text", "number", "date", "datetime", "boolean", "textarea", "email", "url", "tel", "priority"];
    for (const type of types) {
      const fields =
        type === "priority"
          ? [{ key: "f", type, label: "F" }]
          : [{ key: "f", type, label: "F" }];
      expect(() => validateDSLSchema({ name: "X", fields })).not.toThrow();
    }
  });
});

describe("parseDSLSchema", () => {
  it("converts DSL to ParsedSchema with correct title", () => {
    const parsed = parseDSLSchema(minimalDSL);
    expect(parsed.title).toBe("Test List");
  });

  it("maps field key to propertyKey", () => {
    const parsed = parseDSLSchema(minimalDSL);
    expect(parsed.fields[0].propertyKey).toBe("name");
  });

  it("maps field label to propertyName", () => {
    const parsed = parseDSLSchema(minimalDSL);
    expect(parsed.fields[0].propertyName).toBe("Name");
  });

  it("maps field type to propertyType", () => {
    const parsed = parseDSLSchema(minimalDSL);
    expect(parsed.fields[0].propertyType).toBe("text");
  });

  it("defaults isRequired to false when required not specified", () => {
    const parsed = parseDSLSchema(minimalDSL);
    expect(parsed.fields[0].isRequired).toBe(false);
  });

  it("uses required: true when specified", () => {
    const dsl: DSLSchema = { name: "X", fields: [{ key: "f", type: "text", label: "F", required: true }] };
    const parsed = parseDSLSchema(dsl);
    expect(parsed.fields[0].isRequired).toBe(true);
  });

  it("assigns displayOrder from array index when not specified", () => {
    const dsl: DSLSchema = {
      name: "X",
      fields: [
        { key: "a", type: "text", label: "A" },
        { key: "b", type: "text", label: "B" },
      ],
    };
    const parsed = parseDSLSchema(dsl);
    expect(parsed.fields[0].displayOrder).toBe(0);
    expect(parsed.fields[1].displayOrder).toBe(1);
  });

  it("respects explicit displayOrder", () => {
    const dsl: DSLSchema = { name: "X", fields: [{ key: "a", type: "text", label: "A", displayOrder: 5 }] };
    expect(parseDSLSchema(dsl).fields[0].displayOrder).toBe(5);
  });

  it("merges options into validationRules for select fields", () => {
    const dsl: DSLSchema = {
      name: "X",
      fields: [{ key: "tier", type: "select", label: "Tier", options: ["free", "pro"] }],
    };
    const parsed = parseDSLSchema(dsl);
    expect(parsed.fields[0].validationRules?.options).toEqual(["free", "pro"]);
  });

  it("assigns default priority options when none specified", () => {
    const dsl: DSLSchema = { name: "X", fields: [{ key: "p", type: "priority", label: "Priority" }] };
    const parsed = parseDSLSchema(dsl);
    expect(parsed.fields[0].validationRules?.options).toEqual(["low", "medium", "high", "urgent"]);
  });

  it("defaults isVisible to true when visible not specified", () => {
    const parsed = parseDSLSchema(minimalDSL);
    expect(parsed.fields[0].isVisible).toBe(true);
  });

  it("respects visible: false", () => {
    const dsl: DSLSchema = { name: "X", fields: [{ key: "f", type: "text", label: "F", visible: false }] };
    expect(parseDSLSchema(dsl).fields[0].isVisible).toBe(false);
  });

  it("serializes defaultValue to JSON string", () => {
    const dsl: DSLSchema = {
      name: "X",
      fields: [{ key: "f", type: "text", label: "F", defaultValue: "hello" }],
    };
    const parsed = parseDSLSchema(dsl);
    expect(parsed.fields[0].defaultValue).toBe('"hello"');
  });

  it("converts visibility condition to record format", () => {
    const dsl: DSLSchema = {
      name: "X",
      fields: [
        {
          key: "f",
          type: "text",
          label: "F",
          visibility: { condition: { field: "status", operator: "equals", value: "open" } },
        },
      ],
    };
    const parsed = parseDSLSchema(dsl);
    expect(parsed.fields[0].visibilityCondition).toEqual({
      field: "status",
      operator: "equals",
      value: "open",
    });
  });
});

describe("parsedSchemaToDSL (round-trip)", () => {
  it("restores name and description", () => {
    const original: DSLSchema = {
      name: "Tasks",
      description: "A task tracker",
      fields: [{ key: "title", type: "text", label: "Title" }],
    };
    const parsed = parseDSLSchema(original);
    const dsl = parsedSchemaToDSL(parsed);
    expect(dsl.name).toBe("Tasks");
    expect(dsl.description).toBe("A task tracker");
  });

  it("restores field key and label", () => {
    const parsed = parseDSLSchema(minimalDSL);
    const dsl = parsedSchemaToDSL(parsed);
    expect(dsl.fields[0].key).toBe("name");
    expect(dsl.fields[0].label).toBe("Name");
  });

  it("restores required flag", () => {
    const dsl: DSLSchema = { name: "X", fields: [{ key: "f", type: "text", label: "F", required: true }] };
    const roundTripped = parsedSchemaToDSL(parseDSLSchema(dsl));
    expect(roundTripped.fields[0].required).toBe(true);
  });

  it("restores options from validationRules for select fields", () => {
    const dsl: DSLSchema = {
      name: "X",
      fields: [{ key: "tier", type: "select", label: "Tier", options: ["free", "pro"] }],
    };
    const roundTripped = parsedSchemaToDSL(parseDSLSchema(dsl));
    expect(roundTripped.fields[0].options).toEqual(["free", "pro"]);
  });
});