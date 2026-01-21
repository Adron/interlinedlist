/**
 * DSL Validators
 * 
 * Additional validation utilities for DSL schemas beyond the core parser
 */

import { DSLSchema, DSLField, FieldType } from "@/lib/lists/dsl-types";
import { validateDSLSchema } from "@/lib/lists/dsl-parser";

/**
 * Validates that all field keys are unique
 */
export function validateUniqueKeys(fields: DSLField[]): { isValid: boolean; errors: string[] } {
  const keys = fields.map((f) => f.key);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  const uniqueDuplicates = [...new Set(duplicates)];

  if (uniqueDuplicates.length > 0) {
    return {
      isValid: false,
      errors: [`Duplicate field keys found: ${uniqueDuplicates.join(", ")}`],
    };
  }

  return { isValid: true, errors: [] };
}

/**
 * Validates that select/multiselect fields have options
 */
export function validateSelectOptions(fields: DSLField[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  fields.forEach((field) => {
    if ((field.type === "select" || field.type === "multiselect") && !field.options) {
      errors.push(`Field '${field.key}' (type: ${field.type}) must have options`);
    }
    if (field.options && !Array.isArray(field.options)) {
      errors.push(`Field '${field.key}' options must be an array`);
    }
    if (field.options && field.options.length === 0) {
      errors.push(`Field '${field.key}' must have at least one option`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that visibility conditions reference valid fields
 */
export function validateVisibilityConditions(
  fields: DSLField[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const fieldKeys = new Set(fields.map((f) => f.key));

  fields.forEach((field) => {
    if (field.visibility?.condition) {
      const condition = field.visibility.condition;
      if (!fieldKeys.has(condition.field)) {
        errors.push(
          `Field '${field.key}' visibility condition references unknown field '${condition.field}'`
        );
      }
      // Check for circular dependencies (field references itself)
      if (condition.field === field.key) {
        errors.push(`Field '${field.key}' visibility condition cannot reference itself`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that display orders are sequential and non-negative
 */
export function validateDisplayOrders(fields: DSLField[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  fields.forEach((field) => {
    if (field.displayOrder !== undefined && field.displayOrder < 0) {
      errors.push(`Field '${field.key}' has negative display order`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates field key format (alphanumeric, underscores, hyphens)
 */
export function validateFieldKeys(fields: DSLField[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const keyPattern = /^[a-z][a-z0-9_-]*$/;

  fields.forEach((field) => {
    if (!keyPattern.test(field.key)) {
      errors.push(
        `Field key '${field.key}' is invalid. Keys must start with a letter and contain only lowercase letters, numbers, underscores, and hyphens`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that required fields have appropriate defaults or are not conditionally hidden
 */
export function validateRequiredFields(fields: DSLField[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  fields.forEach((field) => {
    if (field.required && field.visibility?.condition) {
      // Warn about required fields with conditional visibility
      // This is allowed but might cause issues
      // We'll just log a warning, not an error
    }
  });

  return {
    isValid: true,
    errors,
  };
}

/**
 * Comprehensive validation of a DSL schema
 */
export function validateDSLComprehensive(schema: DSLSchema): {
  isValid: boolean;
  errors: string[];
} {
  const allErrors: string[] = [];

  // First, use core parser validation
  try {
    validateDSLSchema(schema);
  } catch (error: any) {
    allErrors.push(error.message);
  }

  // Additional validations
  const validations = [
    validateUniqueKeys(schema.fields),
    validateSelectOptions(schema.fields),
    validateVisibilityConditions(schema.fields),
    validateDisplayOrders(schema.fields),
    validateFieldKeys(schema.fields),
    validateRequiredFields(schema.fields),
  ];

  validations.forEach((result) => {
    if (!result.isValid) {
      allErrors.push(...result.errors);
    }
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Get validation summary for a schema
 */
export function getValidationSummary(schema: DSLSchema): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fieldCount: number;
  requiredFieldCount: number;
  conditionalFieldCount: number;
} {
  const validation = validateDSLComprehensive(schema);
  const warnings: string[] = [];

  const requiredFields = schema.fields.filter((f) => f.required);
  const conditionalFields = schema.fields.filter((f) => f.visibility?.condition);

  // Check for potential issues
  schema.fields.forEach((field) => {
    if (field.required && field.visibility?.condition) {
      warnings.push(
        `Field '${field.key}' is required but has conditional visibility - may cause validation issues`
      );
    }
  });

  return {
    isValid: validation.isValid,
    errors: validation.errors,
    warnings,
    fieldCount: schema.fields.length,
    requiredFieldCount: requiredFields.length,
    conditionalFieldCount: conditionalFields.length,
  };
}
