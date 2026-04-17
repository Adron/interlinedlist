/**
 * Select / multiselect options may be stored as plain strings or `{ value, label }` objects.
 */

export type SelectOptionEntry = string | { value: string; label: string };

export function isSelectOptionObject(
  o: unknown
): o is { value: string; label: string } {
  return (
    typeof o === "object" &&
    o !== null &&
    "value" in o &&
    typeof (o as { value: unknown }).value === "string" &&
    "label" in o &&
    typeof (o as { label: unknown }).label === "string"
  );
}

/** Values used for storage and validation (always the `value` string). */
export function getSelectOptionValues(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) =>
    typeof o === "string" ? o : isSelectOptionObject(o) ? o.value : String(o)
  );
}

/** Pairs for `<option>` / display. */
export function getSelectOptionsForRender(options: unknown): {
  value: string;
  label: string;
}[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => {
    if (typeof o === "string") return { value: o, label: o };
    if (isSelectOptionObject(o)) return { value: o.value, label: o.label };
    return { value: String(o), label: String(o) };
  });
}

export function validateSelectOptionsArray(options: unknown, fieldKey: string): void {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error(`Field '${fieldKey}' options must be a non-empty array`);
  }
  for (const o of options) {
    if (typeof o === "string") continue;
    if (isSelectOptionObject(o)) continue;
    throw new Error(
      `Field '${fieldKey}' options must be strings or { value, label } objects`
    );
  }
}
