/**
 * DSL (Domain Specific Language) Types for List Schema Definition
 * 
 * This file defines TypeScript types for the JavaScript-style DSL used to
 * define list schemas with dynamic fields, validation rules, and conditional logic.
 */

/**
 * Supported field types for list properties
 */
export type FieldType =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "select"
  | "multiselect"
  | "textarea"
  | "email"
  | "url"
  | "tel"
  | "color"
  | "file";

/**
 * Validation operators for conditional visibility
 */
export type VisibilityOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual"
  | "isEmpty"
  | "isNotEmpty";

/**
 * Validation rules for a field
 */
export interface ValidationRules {
  min?: number | string;
  max?: number | string;
  pattern?: string;
  options?: string[];
  customValidator?: string;
  step?: number; // For number fields
  minLength?: number; // For string fields
  maxLength?: number; // For string fields
}

/**
 * Visibility condition for conditional field display
 */
export interface VisibilityCondition {
  field: string; // Property key to watch
  operator: VisibilityOperator;
  value: any; // Value to compare against
}

/**
 * Visibility configuration for a field
 */
export interface VisibilityConfig {
  condition: VisibilityCondition;
}

/**
 * DSL Field Definition
 */
export interface DSLField {
  key: string; // Internal key (e.g., "email", "price")
  type: FieldType;
  label: string; // Display label (e.g., "Email Address")
  displayOrder?: number; // Order in which field appears (default: 0)
  required?: boolean; // Whether field is required (default: false)
  defaultValue?: any; // Default value for the field
  validation?: ValidationRules; // Validation rules
  helpText?: string; // Tooltip/help text for form
  placeholder?: string; // Placeholder text
  visible?: boolean; // Whether field is visible by default (default: true)
  visibility?: VisibilityConfig; // Conditional visibility logic
  options?: string[]; // Options for select/multiselect fields
}

/**
 * DSL Schema Definition
 */
export interface DSLSchema {
  name: string; // List name/title
  description?: string; // List description
  fields: DSLField[]; // Array of field definitions
}

/**
 * Parsed field data (after DSL parsing)
 */
export interface ParsedField {
  propertyKey: string;
  propertyName: string;
  propertyType: string;
  displayOrder: number;
  isRequired: boolean;
  defaultValue: string | null;
  validationRules: Record<string, any> | null;
  helpText: string | null;
  placeholder: string | null;
  isVisible: boolean;
  visibilityCondition: Record<string, any> | null;
}

/**
 * Parsed schema data (after DSL parsing)
 */
export interface ParsedSchema {
  title: string;
  description: string | null;
  fields: ParsedField[];
}

/**
 * Form data structure (key-value pairs)
 */
export type FormData = Record<string, any>;

/**
 * Validation error for a field
 */
export interface FieldValidationError {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: FieldValidationError[];
}
