# Validation Rules Guide

Complete guide to validation rules in the DSL.

## Overview

Validation rules are specified in the `validation` property of a field definition. They ensure data integrity and provide user feedback.

```javascript
{
  key: "email",
  type: "email",
  label: "Email",
  validation: {
    // Validation rules here
  }
}
```

## Available Validation Rules

### `min` (number | string)

Minimum value for numeric fields, or minimum date for date/datetime fields.

**For Numbers:**
```javascript
{
  key: "age",
  type: "number",
  validation: {
    min: 0  // Must be 0 or greater
  }
}
```

**For Dates:**
```javascript
{
  key: "birthDate",
  type: "date",
  validation: {
    min: "1900-01-01"  // Cannot be before this date
  }
}
```

### `max` (number | string)

Maximum value for numeric fields, or maximum date for date/datetime fields.

**For Numbers:**
```javascript
{
  key: "price",
  type: "number",
  validation: {
    max: 10000  // Cannot exceed $10,000
  }
}
```

**For Dates:**
```javascript
{
  key: "eventDate",
  type: "date",
  validation: {
    max: new Date().toISOString().split('T')[0]  // Cannot be in the future
  }
}
```

### `minLength` (number)

Minimum character length for text fields (`text`, `textarea`, `email`, `url`, `tel`).

```javascript
{
  key: "password",
  type: "text",
  validation: {
    minLength: 8  // Must be at least 8 characters
  }
}
```

### `maxLength` (number)

Maximum character length for text fields.

```javascript
{
  key: "description",
  type: "textarea",
  validation: {
    maxLength: 2000  // Cannot exceed 2000 characters
  }
}
```

### `pattern` (string)

Regular expression pattern for format validation. Works with text fields.

```javascript
{
  key: "sku",
  type: "text",
  validation: {
    pattern: "^[A-Z0-9-]+$"  // Only uppercase letters, numbers, and hyphens
  }
}
```

**Common Patterns:**
- **Alphanumeric**: `^[a-zA-Z0-9]+$`
- **Uppercase only**: `^[A-Z0-9]+$`
- **Phone (US)**: `^\+1\s?\(?\d{3}\)?\s?-?\d{3}-?\d{4}$`
- **Postal code (US)**: `^\d{5}(-\d{4})?$`
- **Credit card**: `^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$`

### `step` (number)

Increment step for number fields. Useful for currency (0.01) or whole numbers (1).

```javascript
{
  key: "price",
  type: "number",
  validation: {
    min: 0,
    step: 0.01  // Increment by cents
  }
}
```

```javascript
{
  key: "quantity",
  type: "number",
  validation: {
    min: 0,
    step: 1  // Whole numbers only
  }
}
```

### `options` (string[])

Available options for `select` and `multiselect` fields. **Required** for these field types.

```javascript
{
  key: "status",
  type: "select",
  options: ["active", "inactive", "pending"]
}
```

### `customValidator` (string)

Name of a custom validation function. This is for advanced use cases where you need custom validation logic.

```javascript
{
  key: "customField",
  type: "text",
  validation: {
    customValidator: "validateCustomFormat"
  }
}
```

**Note:** Custom validators must be implemented in your application code.

## Field-Specific Validation

### Text Fields (`text`, `textarea`)

```javascript
{
  key: "username",
  type: "text",
  validation: {
    minLength: 3,
    maxLength: 20,
    pattern: "^[a-z0-9_]+$"  // Lowercase, numbers, underscores only
  }
}
```

### Number Fields

```javascript
{
  key: "age",
  type: "number",
  validation: {
    min: 0,
    max: 120,
    step: 1
  }
}
```

### Date Fields

```javascript
{
  key: "eventDate",
  type: "date",
  validation: {
    min: "2024-01-01",  // Cannot be before 2024
    max: "2024-12-31"   // Cannot be after 2024
  }
}
```

### Email Fields

```javascript
{
  key: "email",
  type: "email",
  validation: {
    pattern: "^[\\w\\.-]+@[\\w\\.-]+\\.[a-z]{2,}$"  // Custom email pattern
  }
}
```

**Note:** Email fields have built-in email validation. The pattern is optional.

### Select/Multiselect Fields

```javascript
{
  key: "category",
  type: "select",
  options: ["electronics", "clothing", "home"],  // Required
  validation: {
    // options is the main validation for select fields
  }
}
```

## Validation Examples

### Complete Validation Example

```javascript
const userSchema = {
  name: "User Registration",
  fields: [
    {
      key: "username",
      type: "text",
      label: "Username",
      required: true,
      validation: {
        minLength: 3,
        maxLength: 20,
        pattern: "^[a-z0-9_]+$"
      }
    },
    {
      key: "email",
      type: "email",
      label: "Email",
      required: true,
      validation: {
        pattern: "^[\\w\\.-]+@[\\w\\.-]+\\.[a-z]{2,}$"
      }
    },
    {
      key: "age",
      type: "number",
      label: "Age",
      required: true,
      validation: {
        min: 13,
        max: 120,
        step: 1
      }
    },
    {
      key: "password",
      type: "text",
      label: "Password",
      required: true,
      validation: {
        minLength: 8,
        maxLength: 100,
        pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$"  // At least one lowercase, uppercase, and digit
      }
    }
  ]
};
```

## Validation Error Messages

When validation fails, the system generates user-friendly error messages:

- **Required field empty**: `"{label} is required"`
- **Min value**: `"{label} must be at least {min}"`
- **Max value**: `"{label} must be at most {max}"`
- **Min length**: `"{label} must be at least {minLength} characters"`
- **Max length**: `"{label} must be at most {maxLength} characters"`
- **Pattern mismatch**: `"{label} format is invalid"`
- **Invalid option**: `"{label} must be one of: {options}"`

## Best Practices

1. **Always validate required fields**: Set `required: true` for critical fields.

2. **Use appropriate patterns**: Regex patterns should be well-tested and documented.

3. **Set reasonable limits**: Don't set `maxLength` too low or `min`/`max` too restrictive.

4. **Validate dates**: Use `min` and `max` for date ranges to prevent invalid dates.

5. **Validate numbers**: Set `min: 0` for quantities and prices to prevent negative values.

6. **Test validation**: Test all validation rules with edge cases.

7. **Provide helpful error messages**: The system generates messages, but ensure your field labels are clear.

## Common Validation Patterns

### Password Strength
```javascript
pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
// At least 8 chars, one lowercase, one uppercase, one digit, one special char
```

### Phone Number (US)
```javascript
pattern: "^\\+1\\s?\\(?\\d{3}\\)?\\s?-?\\d{3}-?\\d{4}$"
```

### URL
```javascript
// Use 'url' field type instead, it has built-in validation
type: "url"
```

### Credit Card
```javascript
pattern: "^\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}$"
```

### Postal Code (US)
```javascript
pattern: "^\\d{5}(-\\d{4})?$"
```
