/**
 * DSL Validator
 * 
 * Validates form data against DSL rules and field definitions
 */

import {
  ParsedField,
  FormData,
  ValidationResult,
  FieldValidationError,
  VisibilityOperator,
} from "./dsl-types";

/**
 * Validates a single field value against its rules
 */
function validateFieldValue(
  field: ParsedField,
  value: any,
  allFormData: FormData
): FieldValidationError | null {
  // Check required
  if (field.isRequired) {
    if (value === null || value === undefined || value === "") {
      return {
        field: field.propertyKey,
        message: `${field.propertyName} is required`,
      };
    }
  }

  // If field is not required and value is empty, skip other validations
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const validationRules = field.validationRules || {};

  // Type-specific validation
  switch (field.propertyType) {
    case "number":
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(numValue)) {
        return {
          field: field.propertyKey,
          message: `${field.propertyName} must be a valid number`,
        };
      }
      if (validationRules.min !== undefined && numValue < validationRules.min) {
        return {
          field: field.propertyKey,
          message: `${field.propertyName} must be at least ${validationRules.min}`,
        };
      }
      if (validationRules.max !== undefined && numValue > validationRules.max) {
        return {
          field: field.propertyKey,
          message: `${field.propertyName} must be at most ${validationRules.max}`,
        };
      }
      break;

    case "email":
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value !== "string" || !emailRegex.test(value)) {
        return {
          field: field.propertyKey,
          message: `${field.propertyName} must be a valid email address`,
        };
      }
      break;

    case "url":
      try {
        new URL(value);
      } catch {
        return {
          field: field.propertyKey,
          message: `${field.propertyName} must be a valid URL`,
        };
      }
      break;

    case "select":
      if (validationRules.options && Array.isArray(validationRules.options)) {
        if (!validationRules.options.includes(value)) {
          return {
            field: field.propertyKey,
            message: `${field.propertyName} must be one of: ${validationRules.options.join(", ")}`,
          };
        }
      }
      break;

    case "multiselect":
      if (validationRules.options && Array.isArray(validationRules.options)) {
        if (!Array.isArray(value)) {
          return {
            field: field.propertyKey,
            message: `${field.propertyName} must be an array`,
          };
        }
        const invalidOptions = value.filter((v: any) => !validationRules.options.includes(v));
        if (invalidOptions.length > 0) {
          return {
            field: field.propertyKey,
            message: `${field.propertyName} contains invalid options: ${invalidOptions.join(", ")}`,
          };
        }
      }
      break;

    case "text":
    case "textarea":
      const strValue = String(value);
      if (validationRules.minLength !== undefined && strValue.length < validationRules.minLength) {
        return {
          field: field.propertyKey,
          message: `${field.propertyName} must be at least ${validationRules.minLength} characters`,
        };
      }
      if (validationRules.maxLength !== undefined && strValue.length > validationRules.maxLength) {
        return {
          field: field.propertyKey,
          message: `${field.propertyName} must be at most ${validationRules.maxLength} characters`,
        };
      }
      if (validationRules.pattern) {
        const regex = new RegExp(validationRules.pattern);
        if (!regex.test(strValue)) {
          return {
            field: field.propertyKey,
            message: `${field.propertyName} format is invalid`,
          };
        }
      }
      break;

    case "date":
    case "datetime":
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        return {
          field: field.propertyKey,
          message: `${field.propertyName} must be a valid date`,
        };
      }
      if (validationRules.min && new Date(validationRules.min) > dateValue) {
        return {
          field: field.propertyKey,
          message: `${field.propertyName} must be after ${validationRules.min}`,
        };
      }
      if (validationRules.max && new Date(validationRules.max) < dateValue) {
        return {
          field: field.propertyKey,
          message: `${field.propertyName} must be before ${validationRules.max}`,
        };
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        return {
          field: field.propertyKey,
          message: `${field.propertyName} must be true or false`,
        };
      }
      break;
  }

  return null;
}

/**
 * Evaluates a visibility condition
 */
function evaluateVisibilityCondition(
  condition: Record<string, any>,
  formData: FormData
): boolean {
  const { field, operator, value } = condition;
  const fieldValue = formData[field];

  switch (operator as VisibilityOperator) {
    case "equals":
      return fieldValue === value;
    case "notEquals":
      return fieldValue !== value;
    case "contains":
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
      }
      if (typeof fieldValue === "string") {
        return fieldValue.includes(value);
      }
      return false;
    case "notContains":
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(value);
      }
      if (typeof fieldValue === "string") {
        return !fieldValue.includes(value);
      }
      return true;
    case "greaterThan":
      return Number(fieldValue) > Number(value);
    case "lessThan":
      return Number(fieldValue) < Number(value);
    case "greaterThanOrEqual":
      return Number(fieldValue) >= Number(value);
    case "lessThanOrEqual":
      return Number(fieldValue) <= Number(value);
    case "isEmpty":
      return (
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    case "isNotEmpty":
      return !(
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    default:
      return true;
  }
}

/**
 * Determines if a field should be visible based on its visibility condition
 */
function isFieldVisible(field: ParsedField, formData: FormData): boolean {
  if (!field.isVisible) {
    return false;
  }

  if (field.visibilityCondition) {
    return evaluateVisibilityCondition(field.visibilityCondition, formData);
  }

  return true;
}

/**
 * Validates form data against a list of field definitions
 */
export function validateFormData(
  fields: ParsedField[],
  formData: FormData
): ValidationResult {
  const errors: FieldValidationError[] = [];

  // Sort fields by display order
  const sortedFields = [...fields].sort((a, b) => a.displayOrder - b.displayOrder);

  for (const field of sortedFields) {
    // Skip validation for hidden fields (unless they have a value)
    if (!isFieldVisible(field, formData)) {
      const fieldValue = formData[field.propertyKey];
      // If hidden field has a value, still validate it (might be from previous state)
      if (fieldValue === null || fieldValue === undefined || fieldValue === "") {
        continue;
      }
    }

    const fieldValue = formData[field.propertyKey];
    const error = validateFieldValue(field, fieldValue, formData);

    if (error) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Gets visible fields based on current form data
 */
export function getVisibleFields(fields: ParsedField[], formData: FormData): ParsedField[] {
  return fields.filter((field) => isFieldVisible(field, formData));
}

/**
 * Gets default values for all fields
 */
export function getDefaultValues(fields: ParsedField[]): FormData {
  const defaults: FormData = {};

  for (const field of fields) {
    if (field.defaultValue !== null && field.defaultValue !== undefined && field.defaultValue !== "") {
      // Special handling for multiselect fields
      if (field.propertyType === "multiselect") {
        try {
          // Try parsing as JSON array first
          const parsed = JSON.parse(field.defaultValue);
          if (Array.isArray(parsed)) {
            defaults[field.propertyKey] = parsed;
          } else if (typeof parsed === "string") {
            // JSON.parse succeeded but returned a string (e.g., "\"two,sank\"" -> "two,sank")
            // Parse it as comma-separated string
            const trimmed = parsed.trim();
            if (trimmed) {
              defaults[field.propertyKey] = trimmed
                .split(",")
                .map((v) => v.trim())
                .filter((v) => v.length > 0);
            } else {
              defaults[field.propertyKey] = [];
            }
          } else {
            defaults[field.propertyKey] = [];
          }
        } catch {
          // Fall back to comma-separated string (not JSON)
          const trimmed = field.defaultValue.trim();
          if (trimmed) {
            defaults[field.propertyKey] = trimmed
              .split(",")
              .map((v) => v.trim())
              .filter((v) => v.length > 0);
          } else {
            defaults[field.propertyKey] = [];
          }
        }
      } else {
        // For other field types, try JSON parse first, then fall back to string
        try {
          defaults[field.propertyKey] = JSON.parse(field.defaultValue);
        } catch {
          defaults[field.propertyKey] = field.defaultValue;
        }
      }
    } else {
      // Set type-appropriate defaults
      switch (field.propertyType) {
        case "boolean":
          defaults[field.propertyKey] = false;
          break;
        case "number":
          defaults[field.propertyKey] = 0;
          break;
        case "multiselect":
          defaults[field.propertyKey] = [];
          break;
        default:
          defaults[field.propertyKey] = "";
      }
    }
  }

  return defaults;
}
