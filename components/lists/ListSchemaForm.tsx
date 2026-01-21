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
  const [fields, setFields] = useState<DSLField[]>(
    initialSchema?.fields || [
      {
        key: "",
        type: "text",
        label: "",
        displayOrder: 0,
        required: false,
      },
    ]
  );
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
    const validFields = fields.filter(
      (field) => field.key && field.label
    );

    if (validFields.length === 0) {
      setError("At least one field is required");
      setIsSubmitting(false);
      return;
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
      <div className="mb-3">
        <label htmlFor="schema-name" className="form-label">
          List Name <span className="text-danger">*</span>
        </label>
        <input
          id="schema-name"
          type="text"
          className="form-control"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading || isSubmitting}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="schema-description" className="form-label">
          Description
        </label>
        <textarea
          id="schema-description"
          className="form-control"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={loading || isSubmitting}
        />
      </div>

      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>Fields</h5>
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
          <div key={index} className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
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

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Key (internal) *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={field.key}
                    onChange={(e) =>
                      updateField(index, { key: e.target.value.toLowerCase().replace(/\s+/g, "_") })
                    }
                    placeholder="e.g., email, price"
                    required
                    disabled={loading || isSubmitting}
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Label (display) *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    placeholder="e.g., Email Address"
                    required
                    disabled={loading || isSubmitting}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Type *</label>
                  <select
                    className="form-select"
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

                <div className="col-md-4 mb-3">
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    className="form-control"
                    value={field.displayOrder ?? index}
                    onChange={(e) =>
                      updateField(index, {
                        displayOrder: parseInt(e.target.value) || index,
                      })
                    }
                    disabled={loading || isSubmitting}
                  />
                </div>

                <div className="col-md-4 mb-3">
                  <div className="form-check mt-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={field.required || false}
                      onChange={(e) =>
                        updateField(index, { required: e.target.checked })
                      }
                      disabled={loading || isSubmitting}
                    />
                    <label className="form-check-label">Required</label>
                  </div>
                </div>
              </div>

              {(field.type === "select" || field.type === "multiselect") && (
                <div className="mb-3">
                  <label className="form-label">Options (comma-separated) *</label>
                  <input
                    type="text"
                    className="form-control"
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

              <div className="mb-3">
                <label className="form-label">Placeholder</label>
                <input
                  type="text"
                  className="form-control"
                  value={field.placeholder || ""}
                  onChange={(e) =>
                    updateField(index, { placeholder: e.target.value || undefined })
                  }
                  disabled={loading || isSubmitting}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Help Text</label>
                <textarea
                  className="form-control"
                  value={field.helpText || ""}
                  onChange={(e) =>
                    updateField(index, { helpText: e.target.value || undefined })
                  }
                  rows={2}
                  disabled={loading || isSubmitting}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Default Value</label>
                <input
                  type="text"
                  className="form-control"
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
          </div>
        ))}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="d-flex gap-2 mt-4">
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
