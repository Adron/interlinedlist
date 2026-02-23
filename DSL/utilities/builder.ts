/**
 * DSL Builder
 * 
 * Fluent API for programmatically creating DSL schemas
 */

import { DSLSchema, DSLField, FieldType, ValidationRules, VisibilityConfig } from "@/lib/lists/dsl-types";

export class DSLBuilder {
  private schema: Partial<DSLSchema> = {
    fields: [],
  };

  /**
   * Create a new DSL builder instance
   */
  static create(): DSLBuilder {
    return new DSLBuilder();
  }

  /**
   * Set the schema name
   */
  name(name: string): this {
    this.schema.name = name;
    return this;
  }

  /**
   * Set the schema description
   */
  description(description: string): this {
    this.schema.description = description;
    return this;
  }

  /**
   * Add a field to the schema
   */
  addField(field: DSLField): this {
    if (!this.schema.fields) {
      this.schema.fields = [];
    }
    // Set display order if not provided
    if (field.displayOrder === undefined) {
      field.displayOrder = this.schema.fields.length;
    }
    this.schema.fields.push(field);
    return this;
  }

  /**
   * Build and return the complete DSL schema
   */
  build(): DSLSchema {
    if (!this.schema.name) {
      throw new Error("Schema name is required");
    }
    if (!this.schema.fields || this.schema.fields.length === 0) {
      throw new Error("Schema must have at least one field");
    }
    return this.schema as DSLSchema;
  }
}

/**
 * Field Builder for creating fields with fluent API
 */
export class FieldBuilder {
  private field: Partial<DSLField> = {
    displayOrder: 0,
    required: false,
    visible: true,
  };

  /**
   * Create a new field builder
   */
  static create(key: string, type: FieldType, label: string): FieldBuilder {
    const builder = new FieldBuilder();
    builder.field.key = key;
    builder.field.type = type;
    builder.field.label = label;
    return builder;
  }

  /**
   * Set field as required
   */
  required(required: boolean = true): this {
    this.field.required = required;
    return this;
  }

  /**
   * Set display order
   */
  order(order: number): this {
    this.field.displayOrder = order;
    return this;
  }

  /**
   * Set placeholder text
   */
  placeholder(text: string): this {
    this.field.placeholder = text;
    return this;
  }

  /**
   * Set help text
   */
  helpText(text: string): this {
    this.field.helpText = text;
    return this;
  }

  /**
   * Set default value
   */
  defaultValue(value: any): this {
    this.field.defaultValue = value;
    return this;
  }

  /**
   * Set validation rules
   */
  validation(rules: ValidationRules): this {
    this.field.validation = rules;
    return this;
  }

  /**
   * Set visibility condition
   */
  visibility(condition: VisibilityConfig): this {
    this.field.visibility = condition;
    return this;
  }

  /**
   * Set field visibility (show/hide)
   */
  visible(visible: boolean = true): this {
    this.field.visible = visible;
    return this;
  }

  /**
   * Set options for select/multiselect fields
   */
  options(options: string[]): this {
    this.field.options = options;
    return this;
  }

  /**
   * Build and return the field
   */
  build(): DSLField {
    if (!this.field.key || !this.field.type || !this.field.label) {
      throw new Error("Field key, type, and label are required");
    }
    return this.field as DSLField;
  }
}

/**
 * Helper functions for common field types
 */
export const FieldHelpers = {
  /**
   * Create a text field
   */
  text(key: string, label: string): FieldBuilder {
    return FieldBuilder.create(key, "text", label);
  },

  /**
   * Create an email field
   */
  email(key: string, label: string): FieldBuilder {
    return FieldBuilder.create(key, "email", label);
  },

  /**
   * Create a number field
   */
  number(key: string, label: string): FieldBuilder {
    return FieldBuilder.create(key, "number", label);
  },

  /**
   * Create a date field
   */
  date(key: string, label: string): FieldBuilder {
    return FieldBuilder.create(key, "date", label);
  },

  /**
   * Create a datetime field
   */
  datetime(key: string, label: string): FieldBuilder {
    return FieldBuilder.create(key, "datetime", label);
  },

  /**
   * Create a boolean/checkbox field
   */
  boolean(key: string, label: string): FieldBuilder {
    return FieldBuilder.create(key, "boolean", label);
  },

  /**
   * Create a select field
   */
  select(key: string, label: string, options: string[]): FieldBuilder {
    return FieldBuilder.create(key, "select", label).options(options);
  },

  /**
   * Create a multiselect field
   */
  multiselect(key: string, label: string, options: string[]): FieldBuilder {
    return FieldBuilder.create(key, "multiselect", label).options(options);
  },

  /**
   * Create a textarea field
   */
  textarea(key: string, label: string): FieldBuilder {
    return FieldBuilder.create(key, "textarea", label);
  },

  /**
   * Create a URL field
   */
  url(key: string, label: string): FieldBuilder {
    return FieldBuilder.create(key, "url", label);
  },

  /**
   * Create a tel/phone field
   */
  tel(key: string, label: string): FieldBuilder {
    return FieldBuilder.create(key, "tel", label);
  },
};

/**
 * Example usage:
 * 
 * const schema = DSLBuilder.create()
 *   .name("Customer List")
 *   .description("Manage customers")
 *   .addField(
 *     FieldHelpers.email("email", "Email Address")
 *       .required()
 *       .placeholder("customer@example.com")
 *       .helpText("Primary contact email")
 *       .build()
 *   )
 *   .addField(
 *     FieldHelpers.text("name", "Full Name")
 *       .required()
 *       .validation({ minLength: 2, maxLength: 100 })
 *       .build()
 *   )
 *   .build();
 */
