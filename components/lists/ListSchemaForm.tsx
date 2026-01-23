"use client";

import { useState, FormEvent } from "react";
import { DSLSchema, DSLField, FieldType } from "@/lib/lists/dsl-types";
import { validateDSLSchema } from "@/lib/lists/dsl-parser";

interface ListSchemaFormProps {
  initialSchema?: DSLSchema;
  onSubmit: (schema: DSLSchema) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

const FIELD_TYPES: FieldType[] = [
  "text",
  "number",
  "date",
  "datetime",
  "boolean",
  "select",
  "multiselect",
  "textarea",
  "email",
  "url",
  "tel",
  "color",
  "file",
];

const VISIBILITY_OPERATORS = [
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "greaterThan",
  "lessThan",
  "greaterThanOrEqual",
  "lessThanOrEqual",
  "isEmpty",
  "isNotEmpty",
];

// Generate default field name based on current date/time
const generateDefaultFieldName = (): string => {
  const now = new Date();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const days = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ];
  
  const month = months[now.getMonth()];
  const day = days[now.getDay()];
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const time = `${hours}${minutes}`;
  
  return `listName${month}${day}${time}`;
};

export default function ListSchemaForm({
  initialSchema,
  onSubmit,
  onCancel,
  submitLabel = "Save Schema",
  cancelLabel = "Cancel",
  loading = false,
}: ListSchemaFormProps) {
  const [name, setName] = useState(initialSchema?.name || "");
  const [description, setDescription] = useState(initialSchema?.description || "");
  
  // Generate default field name only if creating new schema (no initialSchema)
  // Always ensure we have a valid default field for new schemas
  const getInitialFields = (): DSLField[] => {
    if (initialSchema?.fields && initialSchema.fields.length > 0) {
      return initialSchema.fields;
    }
    // Create new schema - always include default field
    const defaultFieldName = generateDefaultFieldName();
    return [
      {
        key: defaultFieldName.toLowerCase().replace(/\s+/g, "_"),
        type: "textarea",
        label: defaultFieldName,
        displayOrder: 0,
        required: false,
      },
    ];
  };
  
  const [fields, setFields] = useState<DSLField[]>(getInitialFields());
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (index: number, updates: Partial<DSLField>) => {
    setFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        key: "",
        type: "text",
        label: "",
        displayOrder: prev.length,
        required: false,
      },
    ]);
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === fields.length - 1)
    ) {
      return;
    }

    setFields((prev) => {
      const updated = [...prev];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      // Update display orders
      updated.forEach((field, i) => {
        field.displayOrder = i;
      });
      return updated;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Filter out empty fields
    let validFields = fields.filter(
      (field) => field.key && field.label
    );

    // If no valid fields exist, add the default field
    if (validFields.length === 0) {
      const defaultFieldName = generateDefaultFieldName();
      validFields = [
        {
          key: defaultFieldName.toLowerCase().replace(/\s+/g, "_"),
          type: "textarea" as FieldType,
          label: defaultFieldName,
          displayOrder: 0,
          required: false,
        },
      ];
      // Update the fields state to include the default field
      setFields(validFields);
    }

    const schema: DSLSchema = {
      name: name.trim(),
      description: description.trim() || undefined,
      fields: validFields,
    };

    // Validate schema
    try {
      validateDSLSchema(schema);
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(schema);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-1 mb-1">
        <div className="col-md-6">
          <label htmlFor="schema-name" className="form-label small mb-0">
            List Name <span className="text-danger">*</span>
          </label>
          <input
            id="schema-name"
            type="text"
            className="form-control form-control-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading || isSubmitting}
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="schema-description" className="form-label small mb-0">
            Description
          </label>
          <textarea
            id="schema-description"
            className="form-control form-control-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={1}
            disabled={loading || isSubmitting}
          />
        </div>
      </div>

      <div className="mb-1">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <h6 className="mb-0">Fields</h6>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={addField}
            disabled={loading || isSubmitting}
          >
            Add Field
          </button>
        </div>

        {fields.map((field, index) => (
          <div key={index} className="card mb-1">
            <div className="card-body p-2">
              <div className="d-flex justify-content-between align-items-start mb-1">
                <h6 className="mb-0">Field {index + 1}</h6>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => moveField(index, "up")}
                    disabled={index === 0 || loading || isSubmitting}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => moveField(index, "down")}
                    disabled={index === fields.length - 1 || loading || isSubmitting}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => removeField(index)}
                    disabled={loading || isSubmitting}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="row g-1">
                <div className="col-md-6 mb-1">
                  <label className="form-label small mb-0">Key (internal) *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={field.key}
                    onChange={(e) =>
                      updateField(index, { key: e.target.value.toLowerCase().replace(/\s+/g, "_") })
                    }
                    placeholder="e.g., email, price"
                    required
                    disabled={loading || isSubmitting}
                  />
                </div>

                <div className="col-md-6 mb-1">
                  <label className="form-label small mb-0">Label (display) *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    placeholder="e.g., Email Address"
                    required
                    disabled={loading || isSubmitting}
                  />
                </div>
              </div>

              <div className="row g-1">
                <div className="col-md-4 mb-1">
                  <label className="form-label small mb-0">Type *</label>
                  <select
                    className="form-select form-select-sm"
                    value={field.type}
                    onChange={(e) =>
                      updateField(index, {
                        type: e.target.value as FieldType,
                        options: undefined,
                      })
                    }
                    required
                    disabled={loading || isSubmitting}
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4 mb-1">
                  <label className="form-label small mb-0">Display Order</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={field.displayOrder ?? index}
                    onChange={(e) =>
                      updateField(index, {
                        displayOrder: parseInt(e.target.value) || index,
                      })
                    }
                    disabled={loading || isSubmitting}
                  />
                </div>

                <div className="col-md-4 mb-1">
                  <div className="form-check mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={field.required || false}
                      onChange={(e) =>
                        updateField(index, { required: e.target.checked })
                      }
                      disabled={loading || isSubmitting}
                    />
                    <label className="form-check-label small">Required</label>
                  </div>
                </div>
              </div>

              {(field.type === "select" || field.type === "multiselect") && (
                <div className="mb-1">
                  <label className="form-label small mb-0">Options (comma-separated) *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={field.options?.join(", ") || ""}
                    onChange={(e) =>
                      updateField(index, {
                        options: e.target.value
                          .split(",")
                          .map((opt) => opt.trim())
                          .filter((opt) => opt.length > 0),
                      })
                    }
                    placeholder="option1, option2, option3"
                    required
                    disabled={loading || isSubmitting}
                  />
                </div>
              )}

              <div className="row g-1">
                <div className="col-md-6 mb-1">
                  <label className="form-label small mb-0">Placeholder</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={field.placeholder || ""}
                    onChange={(e) =>
                      updateField(index, { placeholder: e.target.value || undefined })
                    }
                    disabled={loading || isSubmitting}
                  />
                </div>

                <div className="col-md-6 mb-1">
                  <label className="form-label small mb-0">Default Value</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={field.defaultValue || ""}
                    onChange={(e) =>
                      updateField(index, {
                        defaultValue: e.target.value || undefined,
                      })
                    }
                    disabled={loading || isSubmitting}
                  />
                </div>
              </div>

              <div className="mb-1">
                <label className="form-label small mb-0">Help Text</label>
                <textarea
                  className="form-control form-control-sm"
                  value={field.helpText || ""}
                  onChange={(e) =>
                    updateField(index, { helpText: e.target.value || undefined })
                  }
                  rows={1}
                  disabled={loading || isSubmitting}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="d-flex gap-2 mt-3">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || isSubmitting}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading || isSubmitting}
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
}
