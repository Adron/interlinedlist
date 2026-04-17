import { describe, expect, it } from "vitest";
import { getSelectOptionValues } from "./select-options";

describe("getSelectOptionValues", () => {
  it("maps string options", () => {
    expect(getSelectOptionValues(["a", "b"])).toEqual(["a", "b"]);
  });

  it("maps value/label objects to values", () => {
    expect(
      getSelectOptionValues([
        { value: "x", label: "X" },
        { value: "y", label: "Y" },
      ])
    ).toEqual(["x", "y"]);
  });

  it("returns empty array for invalid input", () => {
    expect(getSelectOptionValues(null)).toEqual([]);
    expect(getSelectOptionValues(undefined)).toEqual([]);
  });
});
