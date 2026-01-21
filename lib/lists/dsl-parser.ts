/**
 * DSL Parser
 * 
 * Validates DSL structure and converts it to database records (ParsedSchema)
 */

import {
  DSLSchema,
  DSLField,
  FieldType,
  ParsedSchema,
  ParsedField,
  ValidationRules,
  VisibilityConfig,
} from "./dsl-types";

/**
 * Valid field types
 */
const VALID_FIELD_TYPES: FieldType[] = [
  "text",
  "number",
  "date",
  "datetime",
  "boolean",
  "select",
  "multiselect",
  "textarea",
  "email",
  "url",
  "tel",
  "color",
  "file",
];

/**
 * Validates a field type
 */
function isValidFieldType(type: string): type is FieldType {
  return VALID_FIELD_TYPES.includes(type as FieldType);
}

/**
 * Validates a DSL field definition
 */
function validateField(field: any, index: number): DSLField {
  if (!field || typeof field !== "object") {
    throw new Error(`Field at index ${index} must be an object`);
  }

  if (!field.key || typeof field.key !== "string") {
    throw new Error(`Field at index ${index} must have a 'key' property (string)`);
  }

  if (!field.type || !isValidFieldType(field.type)) {
    throw new Error(
      `Field '${field.key}' has invalid type '${field.type}'. Valid types: ${VALID_FIELD_TYPES.join(", ")}`
    );
  }

  if (!field.label || typeof field.label !== "string") {
    throw new Error(`Field '${field.key}' must have a 'label' property (string)`);
  }

  // Validate select/multiselect fields have options
  if ((field.type === "select" || field.type === "multiselect") && !field.options) {
    throw new Error(`Field '${field.key}' (type: ${field.type}) must have an 'options' array`);
  }

  // Validate options is an array if provided
  if (field.options && !Array.isArray(field.options)) {
    throw new Error(`Field '${field.key}' options must be an array`);
  }

  return field as DSLField;
}

/**
 * Validates a DSL schema
 */
export function validateDSLSchema(dsl: any): DSLSchema {
  if (!dsl || typeof dsl !== "object") {
    throw new Error("DSL must be an object");
  }

  if (!dsl.name || typeof dsl.name !== "string") {
    throw new Error("DSL must have a 'name' property (string)");
  }

  if (!dsl.fields || !Array.isArray(dsl.fields)) {
    throw new Error("DSL must have a 'fields' property (array)");
  }

  if (dsl.fields.length === 0) {
    throw new Error("DSL must have at least one field");
  }

  // Validate all fields
  const validatedFields = dsl.fields.map((field: any, index: number) =>
    validateField(field, index)
  );

  // Check for duplicate keys
  const keys = validatedFields.map((f: DSLField) => f.key);
  const duplicateKeys = keys.filter((key: string, index: number) => keys.indexOf(key) !== index);
  if (duplicateKeys.length > 0) {
    throw new Error(`Duplicate field keys found: ${duplicateKeys.join(", ")}`);
  }

  return {
    name: dsl.name,
    description: dsl.description || undefined,
    fields: validatedFields,
  };
}

/**
 * Serializes a value to JSON string for storage
 */
function serializeValue(value: any): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return JSON.stringify(value);
}

/**
 * Converts validation rules to database format
 */
function convertValidationRules(validation: ValidationRules | undefined): Record<string, any> | null {
  if (!validation) {
    return null;
  }

  const rules: Record<string, any> = {};

  if (validation.min !== undefined) {
    rules.min = validation.min;
  }
  if (validation.max !== undefined) {
    rules.max = validation.max;
  }
  if (validation.pattern !== undefined) {
    rules.pattern = validation.pattern;
  }
  if (validation.options !== undefined) {
    rules.options = validation.options;
  }
  if (validation.customValidator !== undefined) {
    rules.customValidator = validation.customValidator;
  }
  if (validation.step !== undefined) {
    rules.step = validation.step;
  }
  if (validation.minLength !== undefined) {
    rules.minLength = validation.minLength;
  }
  if (validation.maxLength !== undefined) {
    rules.maxLength = validation.maxLength;
  }

  return Object.keys(rules).length > 0 ? rules : null;
}

/**
 * Converts visibility condition to database format
 */
function convertVisibilityCondition(
  visibility: VisibilityConfig | undefined
): Record<string, any> | null {
  if (!visibility || !visibility.condition) {
    return null;
  }

  return {
    field: visibility.condition.field,
    operator: visibility.condition.operator,
    value: visibility.condition.value,
  };
}

/**
 * Parses a DSL schema into database-ready format
 */
export function parseDSLSchema(dsl: DSLSchema): ParsedSchema {
  const validated = validateDSLSchema(dsl);

  const parsedFields: ParsedField[] = validated.fields.map((field, index) => {
    // Handle options for select/multiselect - merge into validation rules
    const validationRules = convertValidationRules(field.validation);
    if (field.options && (field.type === "select" || field.type === "multiselect")) {
      if (!validationRules) {
        return {
          propertyKey: field.key,
          propertyName: field.label,
          propertyType: field.type,
          displayOrder: field.displayOrder ?? index,
          isRequired: field.required ?? false,
          defaultValue: serializeValue(field.defaultValue),
          validationRules: { options: field.options },
          helpText: field.helpText || null,
          placeholder: field.placeholder || null,
          isVisible: field.visible !== false,
          visibilityCondition: convertVisibilityCondition(field.visibility),
        };
      } else {
        validationRules.options = field.options;
      }
    }

    return {
      propertyKey: field.key,
      propertyName: field.label,
      propertyType: field.type,
      displayOrder: field.displayOrder ?? index,
      isRequired: field.required ?? false,
      defaultValue: serializeValue(field.defaultValue),
      validationRules: validationRules,
      helpText: field.helpText || null,
      placeholder: field.placeholder || null,
      isVisible: field.visible !== false,
      visibilityCondition: convertVisibilityCondition(field.visibility),
    };
  });

  return {
    title: validated.name,
    description: validated.description || null,
    fields: parsedFields,
  };
}

/**
 * Converts a parsed schema back to DSL format (for editing)
 */
export function parsedSchemaToDSL(parsed: ParsedSchema): DSLSchema {
  const fields: DSLField[] = parsed.fields.map((field) => {
    const dslField: DSLField = {
      key: field.propertyKey,
      type: field.propertyType as FieldType,
      label: field.propertyName,
      displayOrder: field.displayOrder,
      required: field.isRequired,
      helpText: field.helpText || undefined,
      placeholder: field.placeholder || undefined,
      visible: field.isVisible,
    };

    // Parse default value
    if (field.defaultValue) {
      try {
        dslField.defaultValue = JSON.parse(field.defaultValue);
      } catch {
        dslField.defaultValue = field.defaultValue;
      }
    }

    // Parse validation rules
    if (field.validationRules) {
      dslField.validation = field.validationRules as ValidationRules;
      // Extract options if present
      if (field.validationRules.options) {
        dslField.options = field.validationRules.options as string[];
      }
    }

    // Parse visibility condition
    if (field.visibilityCondition) {
      dslField.visibility = {
        condition: field.visibilityCondition as any,
      };
    }

    return dslField;
  });

  return {
    name: parsed.title,
    description: parsed.description || undefined,
    fields,
  };
}
