import { describe, it, expect } from "vitest";
import { svgHasActiveContent } from "./svg";

describe("svgHasActiveContent", () => {
  it("flags scripts and event handlers", () => {
    expect(svgHasActiveContent('<svg><script>alert(1)</script></svg>')).toBe(true);
    expect(svgHasActiveContent('<svg onload="alert(1)"></svg>')).toBe(true);
    expect(svgHasActiveContent('<svg><a xlink:href="javascript:alert(1)">x</a></svg>')).toBe(true);
    expect(svgHasActiveContent('<svg><foreignObject></foreignObject></svg>')).toBe(true);
    expect(svgHasActiveContent('<!DOCTYPE svg [ <!ENTITY x "y"> ]><svg/>')).toBe(true);
  });

  it("allows a clean static SVG", () => {
    const clean =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#000"/></svg>';
    expect(svgHasActiveContent(clean)).toBe(false);
  });
});
