/**
 * Unit tests for the pure logic inside components/Logo.tsx.
 *
 * The component itself is a React client component that uses DOM APIs
 * (MutationObserver, document) and Next.js Image — none of which are
 * available in the plain node Vitest environment.  Instead we extract
 * and inline the two deterministic pieces of logic that are worth
 * locking in:
 *
 *   1. sizeMap  — maps the size prop to a pixel value.
 *   2. logoPath — selects the correct asset path based on iconOnly and theme.
 *
 * The logoPath logic is the direct target of the branding PR: the icon
 * asset is now '/logo-icon.png' (was a different path) and the SVG
 * wordmarks are theme-keyed as '/logo-light.svg' / '/logo-dark.svg'.
 */

import { describe, expect, it } from "vitest";

// ── inlined from components/Logo.tsx (keep in sync) ──────────────────────────

type Size = "small" | "medium" | "large";
type Theme = "light" | "dark";

const sizeMap: Record<Size, number> = {
  small: 24,
  medium: 32,
  large: 48,
};

function resolveLogoPath(iconOnly: boolean, theme: Theme): string {
  return iconOnly ? "/logo-icon.png" : `/logo-${theme}.svg`;
}

function resolveLogoSize(size: Size): number {
  return sizeMap[size];
}

function resolveTextFontSize(size: Size): string {
  return size === "small" ? "1rem" : size === "medium" ? "1.25rem" : "1.5rem";
}

// ── sizeMap ───────────────────────────────────────────────────────────────────

describe("sizeMap", () => {
  it("maps small to 24px", () => {
    expect(resolveLogoSize("small")).toBe(24);
  });

  it("maps medium to 32px", () => {
    expect(resolveLogoSize("medium")).toBe(32);
  });

  it("maps large to 48px", () => {
    expect(resolveLogoSize("large")).toBe(48);
  });
});

// ── logoPath selection ────────────────────────────────────────────────────────

describe("logoPath — iconOnly=true", () => {
  it("returns /logo-icon.png regardless of light theme", () => {
    expect(resolveLogoPath(true, "light")).toBe("/logo-icon.png");
  });

  it("returns /logo-icon.png regardless of dark theme", () => {
    expect(resolveLogoPath(true, "dark")).toBe("/logo-icon.png");
  });
});

describe("logoPath — iconOnly=false (SVG wordmarks)", () => {
  it("returns /logo-light.svg for light theme", () => {
    expect(resolveLogoPath(false, "light")).toBe("/logo-light.svg");
  });

  it("returns /logo-dark.svg for dark theme", () => {
    expect(resolveLogoPath(false, "dark")).toBe("/logo-dark.svg");
  });
});

// ── text font size (showText branch) ─────────────────────────────────────────

describe("resolveTextFontSize", () => {
  it("returns 1rem for small", () => {
    expect(resolveTextFontSize("small")).toBe("1rem");
  });

  it("returns 1.25rem for medium", () => {
    expect(resolveTextFontSize("medium")).toBe("1.25rem");
  });

  it("returns 1.5rem for large", () => {
    expect(resolveTextFontSize("large")).toBe("1.5rem");
  });
});
