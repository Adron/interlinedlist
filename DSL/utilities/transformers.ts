/**
 * DSL Transformers
 * 
 * Utilities for transforming DSL between different formats
 */

import { DSLSchema, DSLField } from "@/lib/lists/dsl-types";
import { parsedSchemaToDSL } from "@/lib/lists/dsl-parser";
import { ParsedField } from "@/lib/lists/dsl-types";

/**
 * Convert DSL to JSON string
 */
export function toJSON(schema: DSLSchema, pretty: boolean = true): string {
  return pretty ? JSON.stringify(schema, null, 2) : JSON.stringify(schema);
}

/**
 * Parse DSL from JSON string
 */
export function fromJSON(json: string): DSLSchema {
  try {
    const parsed = JSON.parse(json);
    return parsed as DSLSchema;
  } catch (error) {
    throw new Error(`Invalid JSON: ${error}`);
  }
}

/**
 * Convert DSL to a simplified format (for display/export)
 */
export function toSimplified(schema: DSLSchema): {
  name: string;
  description?: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
  }>;
} {
  return {
    name: schema.name,
    description: schema.description,
    fields: schema.fields.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required || false,
    })),
  };
}

/**
 * Convert parsed schema (from database) back to DSL format
 */
export function fromParsedSchema(parsed: {
  title: string;
  description: string | null;
  fields: ParsedField[];
}): DSLSchema {
  return parsedSchemaToDSL(parsed);
}

/**
 * Merge two DSL schemas (useful for extending base schemas)
 */
export function mergeSchemas(base: DSLSchema, extension: DSLSchema): DSLSchema {
  // Merge fields, with extension fields taking precedence for duplicates
  const baseFieldKeys = new Set(base.fields.map((f) => f.key));
  const extensionFields = extension.fields;
  const baseFields = base.fields.filter((f) => !extensionFields.some((ef) => ef.key === f.key));

  return {
    name: extension.name || base.name,
    description: extension.description || base.description,
    fields: [...baseFields, ...extensionFields].map((field, index) => ({
      ...field,
      displayOrder: field.displayOrder ?? index,
    })),
  };
}

/**
 * Clone a DSL schema
 */
export function cloneSchema(schema: DSLSchema): DSLSchema {
  return JSON.parse(JSON.stringify(schema));
}

/**
 * Filter fields from a schema
 */
export function filterFields(
  schema: DSLSchema,
  predicate: (field: DSLField) => boolean
): DSLSchema {
  return {
    ...schema,
    fields: schema.fields.filter(predicate).map((field, index) => ({
      ...field,
      displayOrder: field.displayOrder ?? index,
    })),
  };
}

/**
 * Sort fields by display order
 */
export function sortFields(schema: DSLSchema): DSLSchema {
  return {
    ...schema,
    fields: [...schema.fields].sort((a, b) => {
      const orderA = a.displayOrder ?? 0;
      const orderB = b.displayOrder ?? 0;
      return orderA - orderB;
    }),
  };
}

/**
 * Rename a field in the schema
 */
export function renameField(schema: DSLSchema, oldKey: string, newKey: string): DSLSchema {
  const updated = cloneSchema(schema);
  const field = updated.fields.find((f) => f.key === oldKey);

  if (!field) {
    throw new Error(`Field '${oldKey}' not found`);
  }

  field.key = newKey;

  // Update visibility conditions that reference this field
  updated.fields.forEach((f) => {
    if (f.visibility?.condition?.field === oldKey) {
      if (f.visibility.condition) {
        f.visibility.condition.field = newKey;
      }
    }
  });

  return updated;
}

/**
 * Extract field definitions as a separate object
 */
export function extractFields(schema: DSLSchema): DSLField[] {
  return [...schema.fields];
}

/**
 * Create a schema from fields
 */
export function createSchemaFromFields(
  name: string,
  fields: DSLField[],
  description?: string
): DSLSchema {
  return {
    name,
    description,
    fields: fields.map((field, index) => ({
      ...field,
      displayOrder: field.displayOrder ?? index,
    })),
  };
}

/**
 * Convert DSL to TypeScript interface definition (for documentation)
 */
export function toTypeScriptInterface(schema: DSLSchema): string {
  const interfaceName = schema.name.replace(/\s+/g, "");
  const fields = schema.fields
    .map((field) => {
      let type: string;
      switch (field.type) {
        case "number":
          type = "number";
          break;
        case "boolean":
          type = "boolean";
          break;
        case "date":
        case "datetime":
          type = "Date | string";
          break;
        case "multiselect":
          type = "string[]";
          break;
        default:
          type = "string";
      }
      return `  ${field.key}${field.required ? "" : "?"}: ${type};`;
    })
    .join("\n");

  return `interface ${interfaceName} {\n${fields}\n}`;
}

/**
 * Get schema statistics
 */
export function getSchemaStats(schema: DSLSchema): {
  fieldCount: number;
  requiredFieldCount: number;
  optionalFieldCount: number;
  fieldTypes: Record<string, number>;
  conditionalFieldCount: number;
} {
  const fieldTypes: Record<string, number> = {};
  let requiredCount = 0;
  let conditionalCount = 0;

  schema.fields.forEach((field) => {
    fieldTypes[field.type] = (fieldTypes[field.type] || 0) + 1;
    if (field.required) {
      requiredCount++;
    }
    if (field.visibility?.condition) {
      conditionalCount++;
    }
  });

  return {
    fieldCount: schema.fields.length,
    requiredFieldCount: requiredCount,
    optionalFieldCount: schema.fields.length - requiredCount,
    fieldTypes,
    conditionalFieldCount: conditionalCount,
  };
}
