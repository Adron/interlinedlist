/**
 * Customer List DSL Example
 * 
 * A comprehensive customer management list with contact information,
 * preferences, and status tracking.
 */

const customerListSchema = {
  name: "Customer List",
  description: "Store and manage customer information with contact details and preferences",
  fields: [
    {
      key: "email",
      type: "email",
      label: "Email Address",
      required: true,
      displayOrder: 1,
      placeholder: "customer@example.com",
      helpText: "Primary contact email address",
      validation: {
        pattern: "^[\\w\\.-]+@[\\w\\.-]+\\.[a-z]{2,}$"
      }
    },
    {
      key: "name",
      type: "text",
      label: "Full Name",
      required: true,
      displayOrder: 2,
      placeholder: "John Doe",
      validation: {
        minLength: 2,
        maxLength: 100
      }
    },
    {
      key: "phone",
      type: "tel",
      label: "Phone Number",
      displayOrder: 3,
      placeholder: "+1 (555) 123-4567",
      helpText: "Include country code for international numbers"
    },
    {
      key: "company",
      type: "text",
      label: "Company Name",
      displayOrder: 4,
      placeholder: "Acme Corporation"
    },
    {
      key: "status",
      type: "select",
      label: "Customer Status",
      required: true,
      displayOrder: 5,
      defaultValue: "active",
      options: ["active", "inactive", "pending", "suspended"],
      helpText: "Current status of the customer account"
    },
    {
      key: "tier",
      type: "select",
      label: "Customer Tier",
      displayOrder: 6,
      defaultValue: "standard",
      options: ["standard", "premium", "enterprise"],
      visibility: {
        condition: {
          field: "status",
          operator: "equals",
          value: "active"
        }
      }
    },
    {
      key: "signupDate",
      type: "date",
      label: "Sign Up Date",
      required: true,
      displayOrder: 7,
      defaultValue: new Date().toISOString().split('T')[0]
    },
    {
      key: "lastPurchaseDate",
      type: "date",
      label: "Last Purchase Date",
      displayOrder: 8,
      visibility: {
        condition: {
          field: "status",
          operator: "equals",
          value: "active"
        }
      }
    },
    {
      key: "totalSpent",
      type: "number",
      label: "Total Spent ($)",
      displayOrder: 9,
      defaultValue: 0,
      validation: {
        min: 0,
        step: 0.01
      },
      visibility: {
        condition: {
          field: "status",
          operator: "equals",
          value: "active"
        }
      }
    },
    {
      key: "notes",
      type: "textarea",
      label: "Internal Notes",
      displayOrder: 10,
      placeholder: "Additional information about the customer...",
      helpText: "Private notes visible only to staff",
      validation: {
        maxLength: 1000
      }
    },
    {
      key: "newsletter",
      type: "boolean",
      label: "Subscribed to Newsletter",
      displayOrder: 11,
      defaultValue: false
    }
  ]
};

// Export for use in application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = customerListSchema;
}
