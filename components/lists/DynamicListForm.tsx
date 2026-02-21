"use client";

import { useState, useEffect, FormEvent } from "react";
import { ParsedField, FormData } from "@/lib/lists/dsl-types";
import {
  getFieldComponent,
  getInitialFormData,
  getVisibleFieldsForForm,
  sortFieldsByOrder,
  parseFieldValue,
  formatFieldValue,
} from "@/lib/lists/form-generator";
import { validateFormData } from "@/lib/lists/dsl-validator";
import { parseDateFromInput } from "@/lib/lists/date-utils";

interface DynamicListFormProps {
  fields: ParsedField[];
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  layout?: "vertical" | "horizontal";
}

export default function DynamicListForm({
  fields,
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  loading = false,
  layout = "vertical",
}: DynamicListFormProps) {
  const sortedFields = sortFieldsByOrder(fields);

  // Format date/datetime values from initialData to ISO strings
  const formatInitialData = (data: FormData | undefined): FormData => {
    if (!data) return getInitialFormData(sortedFields);
    const formatted: FormData = {};
    Object.keys(data).forEach((key) => {
      const field = sortedFields.find((f) => f.propertyKey === key);
      if (field && (field.propertyType === "date" || field.propertyType === "datetime")) {
        formatted[key] = formatFieldValue(field, data[key]);
      } else {
        formatted[key] = data[key];
      }
    });
    return { ...getInitialFormData(sortedFields), ...formatted };
  };

  const [formData, setFormData] = useState<FormData>(
    formatInitialData(initialData)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update visible fields when form data changes
  const visibleFields = getVisibleFieldsForForm(sortedFields, formData);

  // Update form data when initialData or fields change, merging with defaults
  useEffect(() => {
    setFormData(formatInitialData(initialData));
  }, [initialData, fields]);

  const handleChange = (fieldKey: string, value: any) => {
    const field = sortedFields.find((f) => f.propertyKey === fieldKey);

    // For date/datetime fields, keep as ISO string (don't parse to Date yet)
    let processedValue = value;
    if (field && (field.propertyType === "date" || field.propertyType === "datetime")) {
      if (typeof value === "string") {
        processedValue = value;
      } else if (value instanceof Date) {
        processedValue = formatFieldValue(field, value);
      } else {
        processedValue = value;
      }
    }

    setFormData((prev) => {
      const updated = { ...prev, [fieldKey]: processedValue };
      // Clear error for this field
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors };
        delete newErrors[fieldKey];
        return newErrors;
      });
      return updated;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Convert ISO string dates to Date objects for validation and submission
    const dataToSubmit = { ...formData };
    sortedFields.forEach((field) => {
      if (field.propertyType === "date" || field.propertyType === "datetime") {
        const value = dataToSubmit[field.propertyKey];
        if (typeof value === "string" && value.trim() !== "") {
          dataToSubmit[field.propertyKey] = parseDateFromInput(value, field.propertyType);
        } else if (!value) {
          dataToSubmit[field.propertyKey] = null;
        }
      }
    });

    // Validate form data
    const validation = validateFormData(sortedFields, dataToSubmit);
    if (!validation.isValid) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach((error) => {
        errorMap[error.field] = error.message;
      });
      setErrors(errorMap);
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(dataToSubmit);
    } catch (error: any) {
      setErrors({ _form: error.message || "An error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: ParsedField) => {
    const fieldComponent = getFieldComponent(field);
    const value = formData[field.propertyKey];
    const error = errors[field.propertyKey];
    const fieldId = field.propertyKey;

    const fieldWrapper = (
      <div key={field.propertyKey} className={layout === "horizontal" ? "" : "mb-2"}>
        <label htmlFor={fieldId} className="form-label small">
          {field.propertyName}
          {field.isRequired && <span className="text-danger">*</span>}
        </label>

        {fieldComponent.type === "input" && (field.propertyType === "date" || field.propertyType === "datetime") ? (
          <input
            id={fieldId}
            name={fieldId}
            type={field.propertyType === "date" ? "date" : "datetime-local"}
            className={`form-control form-control-sm ${error ? "is-invalid" : ""}`}
            value={formatFieldValue(field, value) || ""}
            onChange={(e) => handleChange(field.propertyKey, e.target.value)}
            required={field.isRequired}
            disabled={loading || isSubmitting}
            min={field.validationRules?.min}
            max={field.validationRules?.max}
          />
        ) : fieldComponent.type === "input" && (
          <input
            id={fieldId}
            name={fieldId}
            type={fieldComponent.props.type}
            className={`form-control form-control-sm ${error ? "is-invalid" : ""}`}
            value={
              field.propertyType === "checkbox"
                ? undefined
                : value !== null && value !== undefined
                ? String(value)
                : ""
            }
            checked={
              field.propertyType === "checkbox"
                ? Boolean(value)
                : undefined
            }
            onChange={(e) => {
              const parsed = parseFieldValue(field, e.target.value);
              handleChange(field.propertyKey, parsed);
            }}
            required={field.isRequired}
            placeholder={field.placeholder || undefined}
            disabled={loading || isSubmitting}
            {...(fieldComponent.props.minLength !== undefined && {
              minLength: fieldComponent.props.minLength,
            })}
            {...(fieldComponent.props.maxLength !== undefined && {
              maxLength: fieldComponent.props.maxLength,
            })}
            {...(fieldComponent.props.pattern && {
              pattern: fieldComponent.props.pattern,
            })}
            {...(fieldComponent.props.min !== undefined && {
              min: fieldComponent.props.min,
            })}
            {...(fieldComponent.props.max !== undefined && {
              max: fieldComponent.props.max,
            })}
            {...(fieldComponent.props.step !== undefined && {
              step: fieldComponent.props.step,
            })}
          />
        )}

        {fieldComponent.type === "textarea" && (
          <textarea
            id={fieldId}
            name={fieldId}
            className={`form-control form-control-sm ${error ? "is-invalid" : ""}`}
            value={value !== null && value !== undefined ? String(value) : ""}
            onChange={(e) => handleChange(field.propertyKey, e.target.value)}
            required={field.isRequired}
            placeholder={field.placeholder || undefined}
            disabled={loading || isSubmitting}
            rows={fieldComponent.props.rows}
            {...(fieldComponent.props.minLength !== undefined && {
              minLength: fieldComponent.props.minLength,
            })}
            {...(fieldComponent.props.maxLength !== undefined && {
              maxLength: fieldComponent.props.maxLength,
            })}
          />
        )}

        {fieldComponent.type === "select" && (
          <select
            id={fieldId}
            name={fieldId}
            className={`form-select form-select-sm ${error ? "is-invalid" : ""}`}
            value={
              field.propertyType === "multiselect"
                ? undefined
                : value !== null && value !== undefined
                ? String(value)
                : ""
            }
            multiple={field.propertyType === "multiselect"}
            onChange={(e) => {
              if (field.propertyType === "multiselect") {
                const selected = Array.from(e.target.selectedOptions).map(
                  (option) => option.value
                );
                handleChange(field.propertyKey, selected);
              } else {
                handleChange(field.propertyKey, e.target.value);
              }
            }}
            required={field.isRequired}
            disabled={loading || isSubmitting}
          >
            {!field.isRequired && (
              <option value="">-- Select --</option>
            )}
            {fieldComponent.props.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}

        {field.helpText && (
          <div id={`${fieldId}-help`} className="form-text">
            {field.helpText}
          </div>
        )}

        {error && <div className="invalid-feedback d-block">{error}</div>}
      </div>
    );

    if (layout === "horizontal") {
      // Calculate column width based on field count
      const fieldCount = visibleFields.length;
      let colClass = "col-md-12";
      if (fieldCount <= 2) {
        colClass = "col-md-6";
      } else if (fieldCount <= 3) {
        colClass = "col-md-4";
      } else if (fieldCount <= 4) {
        colClass = "col-md-3";
      } else if (fieldCount <= 6) {
        colClass = "col-md-2";
      } else {
        colClass = "col-md-2";
      }

      return (
        <div key={field.propertyKey} className={`${colClass} mb-2`}>
          {fieldWrapper}
        </div>
      );
    }

    return fieldWrapper;
  };

  return (
    <form onSubmit={handleSubmit}>
      {errors._form && (
        <div className="alert alert-danger" role="alert">
          {errors._form}
        </div>
      )}

      {layout === "horizontal" ? (
        <div className="row g-2">
          {visibleFields.map(renderField)}
        </div>
      ) : (
        visibleFields.map(renderField)
      )}

      <div className="d-flex gap-2 mt-3">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : submitLabel}
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
