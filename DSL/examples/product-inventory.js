/**
 * Product Inventory DSL Example
 * 
 * A product inventory management list with pricing, stock levels,
 * and categorization.
 */

const productInventorySchema = {
  name: "Product Inventory",
  description: "Manage product catalog with inventory tracking and pricing",
  fields: [
    {
      key: "sku",
      type: "text",
      label: "SKU (Stock Keeping Unit)",
      required: true,
      displayOrder: 1,
      placeholder: "PROD-001",
      helpText: "Unique product identifier",
      validation: {
        pattern: "^[A-Z0-9-]+$",
        minLength: 3,
        maxLength: 50
      }
    },
    {
      key: "name",
      type: "text",
      label: "Product Name",
      required: true,
      displayOrder: 2,
      placeholder: "Widget Pro 5000",
      validation: {
        minLength: 3,
        maxLength: 200
      }
    },
    {
      key: "description",
      type: "textarea",
      label: "Product Description",
      displayOrder: 3,
      placeholder: "Detailed product description...",
      validation: {
        maxLength: 2000
      }
    },
    {
      key: "category",
      type: "select",
      label: "Category",
      required: true,
      displayOrder: 4,
      options: ["Electronics", "Clothing", "Home & Garden", "Sports", "Books", "Other"]
    },
    {
      key: "price",
      type: "number",
      label: "Price ($)",
      required: true,
      displayOrder: 5,
      defaultValue: 0,
      validation: {
        min: 0,
        step: 0.01
      },
      helpText: "Price in USD"
    },
    {
      key: "cost",
      type: "number",
      label: "Cost ($)",
      displayOrder: 6,
      defaultValue: 0,
      validation: {
        min: 0,
        step: 0.01
      },
      helpText: "Wholesale cost for profit calculation"
    },
    {
      key: "stockQuantity",
      type: "number",
      label: "Stock Quantity",
      required: true,
      displayOrder: 7,
      defaultValue: 0,
      validation: {
        min: 0,
        step: 1
      }
    },
    {
      key: "lowStockThreshold",
      type: "number",
      label: "Low Stock Alert Threshold",
      displayOrder: 8,
      defaultValue: 10,
      validation: {
        min: 0,
        step: 1
      },
      helpText: "Alert when stock falls below this number"
    },
    {
      key: "isActive",
      type: "boolean",
      label: "Product Active",
      displayOrder: 9,
      defaultValue: true,
      helpText: "Inactive products are hidden from public catalog"
    },
    {
      key: "tags",
      type: "multiselect",
      label: "Product Tags",
      displayOrder: 10,
      options: ["bestseller", "new", "sale", "featured", "limited-edition", "eco-friendly"],
      helpText: "Select multiple tags for categorization"
    },
    {
      key: "releaseDate",
      type: "date",
      label: "Release Date",
      displayOrder: 11,
      visibility: {
        condition: {
          field: "isActive",
          operator: "equals",
          value: true
        }
      }
    },
    {
      key: "imageUrl",
      type: "url",
      label: "Product Image URL",
      displayOrder: 12,
      placeholder: "https://example.com/image.jpg",
      helpText: "Link to product image"
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = productInventorySchema;
}
