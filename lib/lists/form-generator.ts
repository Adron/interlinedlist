/**
 * Form Generator
 * 
 * Generates React form field components from DSL/parsed schema
 */

import { ParsedField, FormData } from "./dsl-types";
import { getVisibleFields, getDefaultValues } from "./dsl-validator";

/**
 * Field component props
 */
export interface FieldComponentProps {
  field: ParsedField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Generates a form field component based on field type
 * Returns JSX as a string representation (for documentation) or component metadata
 */
export function getFieldComponent(field: ParsedField): {
  type: string;
  props: Record<string, any>;
} {
  const baseProps: Record<string, any> = {
    id: field.propertyKey,
    name: field.propertyKey,
    required: field.isRequired,
    placeholder: field.placeholder || undefined,
    "aria-label": field.propertyName,
    ...(field.helpText && { "aria-describedby": `${field.propertyKey}-help` }),
  };

  switch (field.propertyType) {
    case "text":
    case "email":
    case "url":
    case "tel":
      return {
        type: "input",
        props: {
          ...baseProps,
          type: field.propertyType === "text" ? "text" : field.propertyType,
          ...(field.validationRules?.minLength && {
            minLength: field.validationRules.minLength,
          }),
          ...(field.validationRules?.maxLength && {
            maxLength: field.validationRules.maxLength,
          }),
          ...(field.validationRules?.pattern && {
            pattern: field.validationRules.pattern,
          }),
        },
      };

    case "number":
      return {
        type: "input",
        props: {
          ...baseProps,
          type: "number",
          ...(field.validationRules?.min !== undefined && {
            min: field.validationRules.min,
          }),
          ...(field.validationRules?.max !== undefined && {
            max: field.validationRules.max,
          }),
          ...(field.validationRules?.step !== undefined && {
            step: field.validationRules.step,
          }),
        },
      };

    case "date":
    case "datetime":
      return {
        type: "input",
        props: {
          ...baseProps,
          type: field.propertyType === "date" ? "date" : "datetime-local",
          ...(field.validationRules?.min && {
            min: field.validationRules.min,
          }),
          ...(field.validationRules?.max && {
            max: field.validationRules.max,
          }),
        },
      };

    case "boolean":
      return {
        type: "checkbox",
        props: {
          ...baseProps,
          type: "checkbox",
        },
      };

    case "select":
      return {
        type: "select",
        props: {
          ...baseProps,
          options: field.validationRules?.options || [],
        },
      };

    case "multiselect":
      return {
        type: "select",
        props: {
          ...baseProps,
          multiple: true,
          options: field.validationRules?.options || [],
        },
      };

    case "textarea":
      return {
        type: "textarea",
        props: {
          ...baseProps,
          rows: 4,
          ...(field.validationRules?.minLength && {
            minLength: field.validationRules.minLength,
          }),
          ...(field.validationRules?.maxLength && {
            maxLength: field.validationRules.maxLength,
          }),
        },
      };

    case "color":
      return {
        type: "input",
        props: {
          ...baseProps,
          type: "color",
        },
      };

    case "file":
      return {
        type: "input",
        props: {
          ...baseProps,
          type: "file",
        },
      };

    default:
      return {
        type: "input",
        props: {
          ...baseProps,
          type: "text",
        },
      };
  }
}

/**
 * Gets the initial form data with default values
 */
export function getInitialFormData(fields: ParsedField[]): FormData {
  return getDefaultValues(fields);
}

/**
 * Gets visible fields based on current form data
 */
export function getVisibleFieldsForForm(
  fields: ParsedField[],
  formData: FormData
): ParsedField[] {
  return getVisibleFields(fields, formData);
}

/**
 * Sorts fields by display order
 */
export function sortFieldsByOrder(fields: ParsedField[]): ParsedField[] {
  return [...fields].sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Formats a field value for display in form
 */
export function formatFieldValue(field: ParsedField, value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  switch (field.propertyType) {
    case "date":
    case "datetime":
      if (value instanceof Date) {
        if (field.propertyType === "date") {
          return value.toISOString().split("T")[0];
        }
        return value.toISOString().slice(0, 16);
      }
      if (typeof value === "string") {
        return value;
      }
      return "";

    case "boolean":
      return value ? "true" : "false";

    case "multiselect":
      if (Array.isArray(value)) {
        return value.join(",");
      }
      return String(value);

    default:
      return String(value);
  }
}

/**
 * Parses a field value from form input
 */
export function parseFieldValue(field: ParsedField, value: string): any {
  if (value === "" || value === null || value === undefined) {
    if (field.propertyType === "boolean") {
      return false;
    }
    if (field.propertyType === "multiselect") {
      return [];
    }
    return null;
  }

  switch (field.propertyType) {
    case "number":
      const num = parseFloat(value);
      return isNaN(num) ? null : num;

    case "boolean":
      return value === "true" || value === "on";

    case "date":
    case "datetime":
      return new Date(value);

    case "multiselect":
      if (Array.isArray(value)) {
        return value;
      }
      return value.split(",").map((v) => v.trim());

    default:
      return value;
  }
}
