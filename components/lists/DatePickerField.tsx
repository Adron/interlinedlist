"use client";

import { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatDateForInput, parseDateFromInput } from "@/lib/lists/date-utils";

interface DatePickerFieldProps {
  value: string | Date | null;
  onChange: (value: string) => void;
  type: "date" | "datetime";
  minDate?: Date | string;
  maxDate?: Date | string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  onBlur?: () => void;
  autoFocus?: boolean;
}

export default function DatePickerField({
  value,
  onChange,
  type,
  minDate,
  maxDate,
  placeholder,
  disabled = false,
  required = false,
  className = "",
  id,
  onBlur,
  autoFocus = false,
}: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert value to Date object for DatePicker
  const dateValue = (() => {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === "string") {
      return parseDateFromInput(value, type);
    }
    return null;
  })();

  // Initialize tempValue when opening picker
  useEffect(() => {
    if (isOpen && dateValue) {
      setTempValue(dateValue);
    } else if (isOpen && !dateValue) {
      setTempValue(null);
    }
  }, [isOpen, dateValue]);

  const handleDateChange = (date: Date | null) => {
    setTempValue(date);
  };

  const handleDone = () => {
    if (tempValue) {
      const isoString = formatDateForInput(tempValue, type);
      onChange(isoString);
    } else {
      onChange("");
    }
    setIsOpen(false);
    if (onBlur) {
      onBlur();
    }
  };

  const handleCancel = () => {
    setTempValue(dateValue);
    setIsOpen(false);
    if (onBlur) {
      onBlur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Allow partial dates while typing
    onChange(inputValue);
    // Open picker when user starts typing
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputClick = () => {
    setIsOpen(true);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(".date-picker-popup")
      ) {
        setIsOpen(false);
        if (onBlur) {
          onBlur();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onBlur]);

  // Parse min/max dates
  const parsedMinDate = minDate
    ? typeof minDate === "string"
      ? parseDateFromInput(minDate, type)
      : minDate
    : undefined;

  const parsedMaxDate = maxDate
    ? typeof maxDate === "string"
      ? parseDateFromInput(maxDate, type)
      : maxDate
    : undefined;

  const dateFormat = type === "date" ? "yyyy-MM-dd" : "yyyy-MM-dd HH:mm";
  const timeIntervals = type === "datetime" ? 15 : undefined;

  return (
    <div className="date-picker-wrapper" style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        id={id}
        className={`form-control form-control-sm ${className}`}
        value={formatDateForInput(value, type)}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onClick={handleInputClick}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
      />
      {isOpen && (
        <div className="date-picker-popup">
          <DatePicker
            selected={tempValue}
            onChange={handleDateChange}
            showTimeSelect={type === "datetime"}
            timeIntervals={timeIntervals}
            timeFormat="HH:mm"
            dateFormat={dateFormat}
            minDate={parsedMinDate}
            maxDate={parsedMaxDate}
            inline
            calendarClassName="date-picker-calendar"
          />
          <div className="date-picker-footer">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleDone}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
