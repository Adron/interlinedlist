import { describe, expect, it } from "vitest";
import { TEMPLATE_FOLDER_NAME } from "./templates";

describe("TEMPLATE_FOLDER_NAME", () => {
  it("equals '_templates'", () => {
    expect(TEMPLATE_FOLDER_NAME).toBe("_templates");
  });

  it("is a string", () => {
    expect(typeof TEMPLATE_FOLDER_NAME).toBe("string");
  });

  it("starts with underscore (hidden convention for system folders)", () => {
    expect(TEMPLATE_FOLDER_NAME.startsWith("_")).toBe(true);
  });
});
