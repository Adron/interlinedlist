# DSL Syntax Reference

Complete reference for the List Schema DSL (Domain Specific Language).

## Schema Structure

A DSL schema is a JavaScript object with the following structure:

```javascript
{
  name: string,           // Required: Schema name
  description?: string,   // Optional: Schema description
  fields: DSLField[]     // Required: Array of field definitions
}
```

## Field Definition

Each field in the `fields` array is an object with the following properties:

### Required Properties

- **`key`** (string): Internal identifier for the field. Must be unique within the schema. Should be lowercase with underscores or hyphens (e.g., `email_address`, `first-name`).
- **`type`** (FieldType): The type of field. See [Field Types Documentation](./field-types.md) for all available types.
- **`label`** (string): Display label shown to users in forms.

### Optional Properties

- **`displayOrder`** (number): Order in which fields appear in forms. Defaults to array index if not specified.
- **`required`** (boolean): Whether the field is required. Defaults to `false`.
- **`defaultValue`** (any): Default value for the field. Type depends on field type.
- **`placeholder`** (string): Placeholder text shown in empty input fields.
- **`helpText`** (string): Help text or tooltip displayed near the field.
- **`visible`** (boolean): Whether the field is visible by default. Defaults to `true`.
- **`options`** (string[]): Required for `select` and `multiselect` field types. Array of option values.
- **`validation`** (ValidationRules): Validation rules for the field. See [Validation Rules Documentation](./validation-rules.md).
- **`visibility`** (VisibilityConfig): Conditional visibility configuration. See [Conditional Logic Documentation](./conditional-logic.md).

## Complete Field Example

```javascript
{
  key: "email",
  type: "email",
  label: "Email Address",
  required: true,
  displayOrder: 1,
  placeholder: "user@example.com",
  helpText: "We'll never share your email",
  defaultValue: "",
  validation: {
    pattern: "^[\\w\\.-]+@[\\w\\.-]+\\.[a-z]{2,}$"
  },
  visibility: {
    condition: {
      field: "newsletter",
      operator: "equals",
      value: true
    }
  }
}
```

## Field Types

Available field types:

- `text` - Single-line text input
- `number` - Numeric input
- `date` - Date picker
- `datetime` - Date and time picker
- `boolean` - Checkbox
- `select` - Dropdown select (requires `options`)
- `multiselect` - Multi-select dropdown (requires `options`)
- `textarea` - Multi-line text input
- `email` - Email input with validation
- `url` - URL input with validation
- `tel` - Telephone number input
- `color` - Color picker
- `file` - File upload

See [Field Types Documentation](./field-types.md) for detailed information about each type.

## Validation Rules

Validation rules are specified in the `validation` property:

```javascript
validation: {
  min?: number | string,        // Minimum value/length
  max?: number | string,        // Maximum value/length
  pattern?: string,             // Regex pattern
  options?: string[],           // Options for select fields
  step?: number,                // Step for number fields
  minLength?: number,           // Minimum length for strings
  maxLength?: number,           // Maximum length for strings
  customValidator?: string      // Custom validator function name
}
```

See [Validation Rules Documentation](./validation-rules.md) for complete details.

## Conditional Visibility

Fields can be shown or hidden based on other field values:

```javascript
visibility: {
  condition: {
    field: "status",              // Field key to watch
    operator: "equals",           // Comparison operator
    value: "active"              // Value to compare against
  }
}
```

Available operators:
- `equals` - Field equals value
- `notEquals` - Field does not equal value
- `contains` - Field contains value (for strings/arrays)
- `notContains` - Field does not contain value
- `greaterThan` - Field is greater than value
- `lessThan` - Field is less than value
- `greaterThanOrEqual` - Field is greater than or equal to value
- `lessThanOrEqual` - Field is less than or equal to value
- `isEmpty` - Field is empty
- `isNotEmpty` - Field is not empty

See [Conditional Logic Documentation](./conditional-logic.md) for examples.

## Complete Schema Example

```javascript
const mySchema = {
  name: "Contact Form",
  description: "Collect contact information",
  fields: [
    {
      key: "name",
      type: "text",
      label: "Full Name",
      required: true,
      displayOrder: 1,
      validation: {
        minLength: 2,
        maxLength: 100
      }
    },
    {
      key: "email",
      type: "email",
      label: "Email Address",
      required: true,
      displayOrder: 2,
      placeholder: "your@email.com"
    },
    {
      key: "newsletter",
      type: "boolean",
      label: "Subscribe to Newsletter",
      displayOrder: 3,
      defaultValue: false
    },
    {
      key: "preferences",
      type: "multiselect",
      label: "Preferences",
      displayOrder: 4,
      options: ["tech", "sports", "news", "entertainment"],
      visibility: {
        condition: {
          field: "newsletter",
          operator: "equals",
          value: true
        }
      }
    }
  ]
};
```

## Best Practices

1. **Field Keys**: Use lowercase with underscores or hyphens. Start with a letter.
   - Good: `email_address`, `first-name`, `user_id`
   - Bad: `Email`, `first name`, `123field`

2. **Display Order**: Set explicit `displayOrder` values for predictable field ordering.

3. **Required Fields**: Avoid making conditionally visible fields required, as this can cause validation issues.

4. **Validation**: Use appropriate validation rules for each field type.

5. **Help Text**: Provide helpful guidance for complex fields.

6. **Options**: For select fields, use clear, consistent option values.

## TypeScript Support

The DSL is fully typed. Import types from `@/lib/lists/dsl-types`:

```typescript
import { DSLSchema, DSLField, FieldType } from "@/lib/lists/dsl-types";
```
