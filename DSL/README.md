# List Schema DSL (Domain Specific Language)

A JavaScript-style DSL for defining dynamic list schemas with form generation capabilities.

## Quick Start

### Basic Example

```javascript
const mySchema = {
  name: "Customer List",
  description: "Manage customer information",
  fields: [
    {
      key: "email",
      type: "email",
      label: "Email Address",
      required: true,
      placeholder: "customer@example.com"
    },
    {
      key: "name",
      type: "text",
      label: "Full Name",
      required: true,
      validation: {
        minLength: 2,
        maxLength: 100
      }
    },
    {
      key: "status",
      type: "select",
      label: "Status",
      options: ["active", "inactive", "pending"],
      defaultValue: "active"
    }
  ]
};
```

### Using the Builder API

```typescript
import { DSLBuilder, FieldHelpers } from "@/DSL/utilities/builder";

const schema = DSLBuilder.create()
  .name("Customer List")
  .description("Manage customers")
  .addField(
    FieldHelpers.email("email", "Email Address")
      .required()
      .placeholder("customer@example.com")
      .build()
  )
  .addField(
    FieldHelpers.text("name", "Full Name")
      .required()
      .validation({ minLength: 2, maxLength: 100 })
      .build()
  )
  .build();
```

## Documentation

- **[Syntax Reference](./docs/syntax-reference.md)** - Complete DSL syntax documentation
- **[Field Types](./docs/field-types.md)** - All available field types and their usage
- **[Validation Rules](./docs/validation-rules.md)** - Guide to field validation
- **[Conditional Logic](./docs/conditional-logic.md)** - Conditional field visibility guide

## Examples

Ready-to-use DSL examples are available in the `examples/` directory:

- **[Customer List](./examples/customer-list.js)** - Customer management with contact info and status
- **[Product Inventory](./examples/product-inventory.js)** - Product catalog with pricing and stock
- **[Event Registration](./examples/event-registration.js)** - Event registration with ticket selection
- **[Task Tracker](./examples/task-tracker.js)** - Task management with priorities and status
- **[Employee Directory](./examples/employee-directory.js)** - Employee information management

## Utilities

### Builder

Fluent API for programmatically creating DSL schemas:

```typescript
import { DSLBuilder, FieldHelpers } from "@/DSL/utilities/builder";
```

### Validators

Additional validation utilities:

```typescript
import { validateDSLComprehensive, getValidationSummary } from "@/DSL/utilities/validators";
```

### Transformers

Utilities for transforming DSL between formats:

```typescript
import { toJSON, fromJSON, mergeSchemas, cloneSchema } from "@/DSL/utilities/transformers";
```

## Field Types

| Type | Description | Example |
|------|-------------|---------|
| `text` | Single-line text | Names, titles |
| `textarea` | Multi-line text | Descriptions, notes |
| `number` | Numeric input | Prices, quantities |
| `date` | Date picker | Birth dates, events |
| `datetime` | Date & time picker | Appointments |
| `boolean` | Checkbox | Yes/No questions |
| `select` | Dropdown (single) | Status, category |
| `multiselect` | Dropdown (multiple) | Tags, preferences |
| `email` | Email input | Email addresses |
| `url` | URL input | Websites |
| `tel` | Phone input | Phone numbers |

See [Field Types Documentation](./docs/field-types.md) for details.

## Validation

Validation rules ensure data integrity:

```javascript
{
  key: "age",
  type: "number",
  validation: {
    min: 0,
    max: 120
  }
}
```

Common validation rules:
- `min` / `max` - Value range (numbers, dates)
- `minLength` / `maxLength` - String length
- `pattern` - Regex pattern
- `step` - Number increment step
- `options` - Available options (for select fields)

See [Validation Rules Documentation](./docs/validation-rules.md) for complete guide.

## Conditional Visibility

Show/hide fields based on other field values:

```javascript
{
  key: "vipDetails",
  type: "textarea",
  visibility: {
    condition: {
      field: "ticketType",
      operator: "equals",
      value: "vip"
    }
  }
}
```

Available operators:
- `equals`, `notEquals` - Equality checks
- `contains`, `notContains` - String/array checks
- `greaterThan`, `lessThan` - Number comparisons
- `isEmpty`, `isNotEmpty` - Empty checks

See [Conditional Logic Documentation](./docs/conditional-logic.md) for examples.

## Integration

### Using DSL in Your Application

1. **Define your schema** (using DSL or Builder API)
2. **Validate the schema**:
   ```typescript
   import { validateDSLSchema } from "@/lib/lists/dsl-parser";
   const validated = validateDSLSchema(mySchema);
   ```
3. **Create a list** via API:
   ```typescript
   const response = await fetch("/api/lists", {
     method: "POST",
     body: JSON.stringify({ title: "My List", schema: mySchema })
   });
   ```
4. **Use DynamicListForm** component:
   ```tsx
   import DynamicListForm from "@/components/lists/DynamicListForm";
   
   <DynamicListForm
     fields={listProperties}
     onSubmit={handleSubmit}
   />
   ```

### Importing Examples

```typescript
// In a TypeScript/JavaScript file
import customerListSchema from "@/DSL/examples/customer-list.js";

// Use the schema
const response = await fetch("/api/lists", {
  method: "POST",
  body: JSON.stringify({
    title: "Customers",
    schema: customerListSchema
  })
});
```

## Best Practices

1. **Use descriptive field keys**: `email_address` not `e1`
2. **Set explicit display orders**: For predictable field ordering
3. **Provide help text**: Guide users on complex fields
4. **Validate appropriately**: Use validation rules for data integrity
5. **Test conditional logic**: Ensure visibility conditions work correctly
6. **Avoid circular dependencies**: Fields can't reference themselves

## TypeScript Support

The DSL is fully typed. Import types:

```typescript
import {
  DSLSchema,
  DSLField,
  FieldType,
  ValidationRules,
  VisibilityConfig
} from "@/lib/lists/dsl-types";
```

## API Reference

### Core Functions

- `validateDSLSchema(schema)` - Validate DSL structure
- `parseDSLSchema(schema)` - Parse DSL to database format
- `validateFormData(fields, data)` - Validate form data against schema

### Builder API

- `DSLBuilder.create()` - Create a new builder
- `FieldHelpers.*` - Helper functions for each field type

### Transformers

- `toJSON(schema, pretty?)` - Convert to JSON string
- `fromJSON(json)` - Parse from JSON string
- `mergeSchemas(base, extension)` - Merge two schemas
- `cloneSchema(schema)` - Clone a schema

### Validators

- `validateDSLComprehensive(schema)` - Comprehensive validation
- `getValidationSummary(schema)` - Get validation summary with stats

## Resources

- [Syntax Reference](./docs/syntax-reference.md)
- [Field Types](./docs/field-types.md)
- [Validation Rules](./docs/validation-rules.md)
- [Conditional Logic](./docs/conditional-logic.md)
- [Examples Directory](./examples/)

## Support

For questions or issues, refer to the documentation files or check the main project README.
