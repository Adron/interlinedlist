# Field Types Documentation

Complete guide to all available field types in the DSL.

## Text Fields

### `text`

Single-line text input field.

**Example:**
```javascript
{
  key: "name",
  type: "text",
  label: "Full Name",
  validation: {
    minLength: 2,
    maxLength: 100
  }
}
```

**Validation Options:**
- `minLength` (number): Minimum character length
- `maxLength` (number): Maximum character length
- `pattern` (string): Regex pattern for format validation

### `textarea`

Multi-line text input field.

**Example:**
```javascript
{
  key: "description",
  type: "textarea",
  label: "Description",
  placeholder: "Enter detailed description...",
  validation: {
    maxLength: 2000
  }
}
```

**Validation Options:**
- `minLength` (number): Minimum character length
- `maxLength` (number): Maximum character length
- `pattern` (string): Regex pattern for format validation

## Numeric Fields

### `number`

Numeric input field. Supports integers and decimals.

**Example:**
```javascript
{
  key: "price",
  type: "number",
  label: "Price ($)",
  defaultValue: 0,
  validation: {
    min: 0,
    max: 10000,
    step: 0.01
  }
}
```

**Validation Options:**
- `min` (number): Minimum value
- `max` (number): Maximum value
- `step` (number): Increment step (e.g., 0.01 for currency, 1 for integers)

## Date and Time Fields

### `date`

Date picker field (date only, no time).

**Example:**
```javascript
{
  key: "birthDate",
  type: "date",
  label: "Date of Birth",
  validation: {
    max: new Date().toISOString().split('T')[0] // Cannot be in the future
  }
}
```

**Validation Options:**
- `min` (string): Minimum date (ISO format: YYYY-MM-DD)
- `max` (string): Maximum date (ISO format: YYYY-MM-DD)

**Default Value:** ISO date string (YYYY-MM-DD)

### `datetime`

Date and time picker field.

**Example:**
```javascript
{
  key: "appointmentTime",
  type: "datetime",
  label: "Appointment Time",
  required: true
}
```

**Validation Options:**
- `min` (string): Minimum datetime (ISO format)
- `max` (string): Maximum datetime (ISO format)

**Default Value:** ISO datetime string

## Boolean Fields

### `boolean`

Checkbox field for true/false values.

**Example:**
```javascript
{
  key: "newsletter",
  type: "boolean",
  label: "Subscribe to Newsletter",
  defaultValue: false
}
```

**Default Value:** `true` or `false`

## Selection Fields

### `select`

Single-select dropdown field. **Requires `options` array.**

**Example:**
```javascript
{
  key: "status",
  type: "select",
  label: "Status",
  required: true,
  options: ["active", "inactive", "pending"],
  defaultValue: "pending"
}
```

**Required Properties:**
- `options` (string[]): Array of selectable option values

**Default Value:** One of the option values

### `multiselect`

Multi-select dropdown field. **Requires `options` array.**

**Example:**
```javascript
{
  key: "tags",
  type: "multiselect",
  label: "Tags",
  options: ["urgent", "important", "review", "feature"],
  defaultValue: []
}
```

**Required Properties:**
- `options` (string[]): Array of selectable option values

**Default Value:** Array of selected option values

## Specialized Text Fields

### `email`

Email address input with built-in email format validation.

**Example:**
```javascript
{
  key: "email",
  type: "email",
  label: "Email Address",
  required: true,
  placeholder: "user@example.com",
  validation: {
    pattern: "^[\\w\\.-]+@[\\w\\.-]+\\.[a-z]{2,}$"
  }
}
```

**Validation Options:**
- `pattern` (string): Custom email regex pattern (optional, has default validation)

### `url`

URL input with built-in URL format validation.

**Example:**
```javascript
{
  key: "website",
  type: "url",
  label: "Website URL",
  placeholder: "https://example.com"
}
```

**Validation:** Automatically validates URL format

### `tel`

Telephone number input field.

**Example:**
```javascript
{
  key: "phone",
  type: "tel",
  label: "Phone Number",
  placeholder: "+1 (555) 123-4567"
}
```

**Validation Options:**
- `pattern` (string): Regex pattern for phone number format

## Other Field Types

### `color`

Color picker field.

**Example:**
```javascript
{
  key: "themeColor",
  type: "color",
  label: "Theme Color",
  defaultValue: "#000000"
}
```

**Default Value:** Hex color code (e.g., `#FF0000`)

### `file`

File upload field.

**Example:**
```javascript
{
  key: "avatar",
  type: "file",
  label: "Profile Picture"
}
```

**Note:** File handling depends on your application's file upload implementation.

## Field Type Comparison

| Type | Input Type | Value Type | Supports Options | Supports Pattern |
|------|-----------|------------|------------------|------------------|
| `text` | Text input | string | No | Yes |
| `textarea` | Textarea | string | No | Yes |
| `number` | Number input | number | No | No |
| `date` | Date picker | string (ISO) | No | No |
| `datetime` | DateTime picker | string (ISO) | No | No |
| `boolean` | Checkbox | boolean | No | No |
| `select` | Dropdown | string | **Yes** | No |
| `multiselect` | Multi-dropdown | string[] | **Yes** | No |
| `email` | Email input | string | No | Yes |
| `url` | URL input | string | No | No |
| `tel` | Tel input | string | No | Yes |
| `color` | Color picker | string (hex) | No | No |
| `file` | File input | File/string | No | No |

## Choosing the Right Field Type

- **Names, titles, descriptions**: Use `text` or `textarea`
- **Numbers, prices, quantities**: Use `number`
- **Dates without time**: Use `date`
- **Dates with time**: Use `datetime`
- **Yes/No questions**: Use `boolean`
- **Single choice from list**: Use `select`
- **Multiple choices from list**: Use `multiselect`
- **Email addresses**: Use `email`
- **Websites**: Use `url`
- **Phone numbers**: Use `tel`
- **Color selection**: Use `color`
- **File uploads**: Use `file`

## Default Values by Type

- `text`, `textarea`, `email`, `url`, `tel`: `""` (empty string)
- `number`: `0`
- `date`, `datetime`: Current date (or `""` if not set)
- `boolean`: `false`
- `select`: First option value (or `""` if not set)
- `multiselect`: `[]` (empty array)
- `color`: `#000000` (black)
- `file`: `null`
