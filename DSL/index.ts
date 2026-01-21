/**
 * DSL Main Export
 * 
 * Central export point for all DSL functionality
 */

// Utilities
export * from "./utilities";

// Examples
export * from "./examples";

// Re-export core types for convenience
export type {
  DSLSchema,
  DSLField,
  FieldType,
  ValidationRules,
  VisibilityConfig,
  VisibilityCondition,
  VisibilityOperator,
  FormData,
  ValidationResult,
  FieldValidationError,
} from "@/lib/lists/dsl-types";

// Re-export core functions for convenience
export {
  validateDSLSchema,
  parseDSLSchema,
  parsedSchemaToDSL,
} from "@/lib/lists/dsl-parser";

export {
  validateFormData,
  getVisibleFields,
  getDefaultValues,
} from "@/lib/lists/dsl-validator";
