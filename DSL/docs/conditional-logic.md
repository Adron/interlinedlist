# Conditional Logic Guide

Guide to conditional field visibility in the DSL.

## Overview

Conditional visibility allows fields to be shown or hidden based on the values of other fields. This creates dynamic, context-aware forms.

## Basic Syntax

```javascript
{
  key: "fieldName",
  type: "text",
  label: "Field Label",
  visibility: {
    condition: {
      field: "otherField",    // Field to watch
      operator: "equals",     // Comparison operator
      value: "targetValue"    // Value to compare against
    }
  }
}
```

## Available Operators

### Equality Operators

#### `equals`
Field value equals the target value.

```javascript
{
  key: "vipDetails",
  type: "textarea",
  label: "VIP Details",
  visibility: {
    condition: {
      field: "ticketType",
      operator: "equals",
      value: "vip"
    }
  }
}
```

#### `notEquals`
Field value does not equal the target value.

```javascript
{
  key: "studentId",
  type: "text",
  label: "Student ID",
  visibility: {
    condition: {
      field: "ticketType",
      operator: "notEquals",
      value: "general"
    }
  }
}
```

### Comparison Operators

#### `greaterThan`
Field value is greater than the target value (for numbers).

```javascript
{
  key: "discountCode",
  type: "text",
  label: "Discount Code",
  visibility: {
    condition: {
      field: "quantity",
      operator: "greaterThan",
      value: 5
    }
  }
}
```

#### `lessThan`
Field value is less than the target value (for numbers).

```javascript
{
  key: "smallOrderNote",
  type: "textarea",
  label: "Note",
  visibility: {
    condition: {
      field: "quantity",
      operator: "lessThan",
      value: 10
    }
  }
}
```

#### `greaterThanOrEqual`
Field value is greater than or equal to the target value.

```javascript
{
  key: "bulkDiscount",
  type: "number",
  label: "Bulk Discount (%)",
  visibility: {
    condition: {
      field: "quantity",
      operator: "greaterThanOrEqual",
      value: 100
    }
  }
}
```

#### `lessThanOrEqual`
Field value is less than or equal to the target value.

```javascript
{
  key: "earlyBirdDiscount",
  type: "number",
  label: "Early Bird Discount (%)",
  visibility: {
    condition: {
      field: "daysUntilEvent",
      operator: "lessThanOrEqual",
      value: 30
    }
  }
}
```

### String/Array Operators

#### `contains`
Field value (string or array) contains the target value.

```javascript
{
  key: "vegetarianOptions",
  type: "multiselect",
  label: "Vegetarian Options",
  visibility: {
    condition: {
      field: "dietaryRestrictions",
      operator: "contains",
      value: "vegetarian"
    }
  }
}
```

**Works with:**
- Strings: Checks if string contains substring
- Arrays: Checks if array includes value

#### `notContains`
Field value (string or array) does not contain the target value.

```javascript
{
  key: "meatOptions",
  type: "multiselect",
  label: "Meat Options",
  visibility: {
    condition: {
      field: "dietaryRestrictions",
      operator: "notContains",
      value: "vegetarian"
    }
  }
}
```

### Empty/NotEmpty Operators

#### `isEmpty`
Field is empty (null, undefined, empty string, or empty array).

```javascript
{
  key: "optionalNotes",
  type: "textarea",
  label: "Optional Notes",
  visibility: {
    condition: {
      field: "hasNotes",
      operator: "isEmpty",
      value: null  // value is ignored for isEmpty/isNotEmpty
    }
  }
}
```

#### `isNotEmpty`
Field is not empty.

```javascript
{
  key: "followUpNotes",
  type: "textarea",
  label: "Follow-up Notes",
  visibility: {
    condition: {
      field: "status",
      operator: "isNotEmpty",
      value: null  // value is ignored for isEmpty/isNotEmpty
    }
  }
}
```

## Complete Examples

### Example 1: Ticket Type Selection

```javascript
const eventSchema = {
  name: "Event Registration",
  fields: [
    {
      key: "ticketType",
      type: "select",
      label: "Ticket Type",
      required: true,
      options: ["general", "vip", "student", "early-bird"]
    },
    {
      key: "studentId",
      type: "text",
      label: "Student ID",
      visibility: {
        condition: {
          field: "ticketType",
          operator: "equals",
          value: "student"
        }
      }
    },
    {
      key: "vipLounge",
      type: "boolean",
      label: "Access VIP Lounge",
      visibility: {
        condition: {
          field: "ticketType",
          operator: "equals",
          value: "vip"
        }
      }
    },
    {
      key: "earlyBirdDiscount",
      type: "number",
      label: "Early Bird Discount Applied (%)",
      visibility: {
        condition: {
          field: "ticketType",
          operator: "equals",
          value: "early-bird"
        }
      }
    }
  ]
};
```

### Example 2: Quantity-Based Discounts

```javascript
const orderSchema = {
  name: "Order Form",
  fields: [
    {
      key: "quantity",
      type: "number",
      label: "Quantity",
      required: true,
      defaultValue: 1
    },
    {
      key: "bulkDiscount",
      type: "number",
      label: "Bulk Discount (%)",
      defaultValue: 0,
      visibility: {
        condition: {
          field: "quantity",
          operator: "greaterThanOrEqual",
          value: 10
        }
      }
    },
    {
      key: "wholesalePrice",
      type: "number",
      label: "Wholesale Price",
      visibility: {
        condition: {
          field: "quantity",
          operator: "greaterThanOrEqual",
          value: 100
        }
      }
    }
  ]
};
```

### Example 3: Multi-Conditional Fields

```javascript
const customerSchema = {
  name: "Customer Form",
  fields: [
    {
      key: "status",
      type: "select",
      label: "Status",
      options: ["active", "inactive", "pending"]
    },
    {
      key: "subscription",
      type: "boolean",
      label: "Has Active Subscription"
    },
    {
      key: "lastPurchaseDate",
      type: "date",
      label: "Last Purchase Date",
      // Show only for active customers
      visibility: {
        condition: {
          field: "status",
          operator: "equals",
          value: "active"
        }
      }
    },
    {
      key: "renewalDate",
      type: "date",
      label: "Subscription Renewal Date",
      // Show only if subscription is active
      visibility: {
        condition: {
          field: "subscription",
          operator: "equals",
          value: true
        }
      }
    },
    {
      key: "reactivationNotes",
      type: "textarea",
      label: "Reactivation Notes",
      // Show only for inactive customers
      visibility: {
        condition: {
          field: "status",
          operator: "equals",
          value: "inactive"
        }
      }
    }
  ]
};
```

### Example 4: Array-Based Conditions

```javascript
const registrationSchema = {
  name: "Event Registration",
  fields: [
    {
      key: "dietaryRestrictions",
      type: "multiselect",
      label: "Dietary Restrictions",
      options: ["vegetarian", "vegan", "gluten-free", "nut-allergy"]
    },
    {
      key: "vegetarianMenu",
      type: "select",
      label: "Vegetarian Menu Option",
      options: ["option1", "option2"],
      visibility: {
        condition: {
          field: "dietaryRestrictions",
          operator: "contains",
          value: "vegetarian"
        }
      }
    },
    {
      key: "nutAllergyDetails",
      type: "textarea",
      label: "Nut Allergy Details",
      visibility: {
        condition: {
          field: "dietaryRestrictions",
          operator: "contains",
          value: "nut-allergy"
        }
      }
    }
  ]
};
```

## Best Practices

1. **Avoid Circular Dependencies**: A field cannot reference itself in its visibility condition.

2. **Consider Required Fields**: Be careful making conditionally visible fields required, as this can cause validation issues if the condition is false.

3. **Use Clear Field Keys**: Use descriptive field keys for better readability when referencing in conditions.

4. **Test All Conditions**: Test your form with all possible field value combinations to ensure conditions work as expected.

5. **Order Matters**: Fields are evaluated in `displayOrder`. Ensure fields referenced in conditions appear before fields that depend on them.

6. **Default Values**: Consider setting appropriate default values for fields that control visibility.

## Common Patterns

### Show/Hide Based on Boolean

```javascript
visibility: {
  condition: {
    field: "newsletter",
    operator: "equals",
    value: true
  }
}
```

### Show/Hide Based on Selection

```javascript
visibility: {
  condition: {
    field: "userType",
    operator: "equals",
    value: "premium"
  }
}
```

### Show/Hide Based on Quantity

```javascript
visibility: {
  condition: {
    field: "quantity",
    operator: "greaterThan",
    value: 10
  }
}
```

### Show/Hide When Field Has Value

```javascript
visibility: {
  condition: {
    field: "company",
    operator: "isNotEmpty",
    value: null
  }
}
```

## Operator Reference Table

| Operator | Works With | Description |
|----------|------------|-------------|
| `equals` | All types | Value equals target |
| `notEquals` | All types | Value does not equal target |
| `contains` | String, Array | Value contains target |
| `notContains` | String, Array | Value does not contain target |
| `greaterThan` | Number, Date | Value is greater than target |
| `lessThan` | Number, Date | Value is less than target |
| `greaterThanOrEqual` | Number, Date | Value is greater than or equal to target |
| `lessThanOrEqual` | Number, Date | Value is less than or equal to target |
| `isEmpty` | All types | Value is empty |
| `isNotEmpty` | All types | Value is not empty |
