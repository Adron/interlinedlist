import { describe, expect, it } from "vitest";
import { formatDateTime, formatDatagridDateTime } from "./relativeTime";

describe("formatDateTime", () => {
  it("returns a non-empty string", () => {
    const result = formatDateTime(new Date(2026, 1, 5, 10, 2));
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("accepts a date string input", () => {
    const result = formatDateTime("2026-01-01T12:00:00");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes the year", () => {
    expect(formatDateTime(new Date(2026, 1, 5, 10, 2))).toContain("2026");
  });

  it("includes the month name", () => {
    expect(formatDateTime(new Date(2026, 1, 5, 10, 2))).toContain("February");
  });

  // ──── ordinal suffix edge cases ────────────────────────────────────────────

  it("uses 'st' for day 1", () => {
    expect(formatDateTime(new Date(2026, 0, 1, 12, 0))).toContain("1st");
  });

  it("uses 'nd' for day 2", () => {
    expect(formatDateTime(new Date(2026, 0, 2, 12, 0))).toContain("2nd");
  });

  it("uses 'rd' for day 3", () => {
    expect(formatDateTime(new Date(2026, 0, 3, 12, 0))).toContain("3rd");
  });

  it("uses 'th' for days 4–10", () => {
    expect(formatDateTime(new Date(2026, 0, 4, 12, 0))).toContain("4th");
    expect(formatDateTime(new Date(2026, 0, 10, 12, 0))).toContain("10th");
  });

  it("uses 'th' for 11 (exception: not '11st')", () => {
    expect(formatDateTime(new Date(2026, 0, 11, 12, 0))).toContain("11th");
  });

  it("uses 'th' for 12 (exception: not '12nd')", () => {
    expect(formatDateTime(new Date(2026, 0, 12, 12, 0))).toContain("12th");
  });

  it("uses 'th' for 13 (exception: not '13rd')", () => {
    expect(formatDateTime(new Date(2026, 0, 13, 12, 0))).toContain("13th");
  });

  it("uses 'st' for 21", () => {
    expect(formatDateTime(new Date(2026, 0, 21, 12, 0))).toContain("21st");
  });

  it("uses 'nd' for 22", () => {
    expect(formatDateTime(new Date(2026, 0, 22, 12, 0))).toContain("22nd");
  });

  it("uses 'rd' for 23", () => {
    expect(formatDateTime(new Date(2026, 0, 23, 12, 0))).toContain("23rd");
  });

  it("uses 'th' for 20, 24–30", () => {
    expect(formatDateTime(new Date(2026, 0, 20, 12, 0))).toContain("20th");
    expect(formatDateTime(new Date(2026, 0, 30, 12, 0))).toContain("30th");
  });

  it("uses 'st' for 31", () => {
    expect(formatDateTime(new Date(2026, 0, 31, 12, 0))).toContain("31st");
  });

  // ──── time formatting ───────────────────────────────────────────────────────

  it("formats midnight as 12:00am", () => {
    expect(formatDateTime(new Date(2026, 0, 15, 0, 0))).toContain("12:00am");
  });

  it("formats noon as 12:00pm", () => {
    expect(formatDateTime(new Date(2026, 0, 15, 12, 0))).toContain("12:00pm");
  });

  it("formats 1 pm as 1:00pm", () => {
    expect(formatDateTime(new Date(2026, 0, 15, 13, 0))).toContain("1:00pm");
  });

  it("formats 11 am correctly", () => {
    expect(formatDateTime(new Date(2026, 0, 15, 11, 0))).toContain("11:00am");
  });

  it("pads single-digit minutes with a leading zero", () => {
    expect(formatDateTime(new Date(2026, 0, 15, 9, 5))).toContain("9:05am");
  });

  it("formats the @ separator correctly", () => {
    expect(formatDateTime(new Date(2026, 0, 15, 10, 30))).toContain("@");
  });
});

describe("formatDatagridDateTime", () => {
  it("formats as DD/MM/YYYY HH:MM:SS in 24-hour clock", () => {
    const d = new Date(2026, 1, 5, 19, 15, 30); // Feb 5, 2026 19:15:30 local
    expect(formatDatagridDateTime(d)).toBe("05/02/2026 19:15:30");
  });

  it("pads single-digit day and month with leading zeros", () => {
    const d = new Date(2026, 0, 1, 9, 5, 3); // Jan 1, 2026 09:05:03
    expect(formatDatagridDateTime(d)).toBe("01/01/2026 09:05:03");
  });

  it("pads single-digit hours, minutes, and seconds", () => {
    const d = new Date(2026, 5, 3, 4, 6, 8); // Jun 3, 2026 04:06:08
    expect(formatDatagridDateTime(d)).toBe("03/06/2026 04:06:08");
  });

  it("uses 24-hour clock and does not include am/pm", () => {
    const d = new Date(2026, 0, 15, 23, 59, 59);
    const result = formatDatagridDateTime(d);
    expect(result).toContain("23:59:59");
    expect(result).not.toContain("pm");
    expect(result).not.toContain("am");
  });

  it("accepts a date string input", () => {
    const result = formatDatagridDateTime("2026-02-05T19:15:30");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes a space separator between date and time parts", () => {
    const result = formatDatagridDateTime(new Date(2026, 0, 1, 10, 0, 0));
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/);
  });
});
