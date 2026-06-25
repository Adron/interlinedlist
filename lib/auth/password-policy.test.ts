import { describe, it, expect } from "vitest";
import { validatePassword, MIN_PASSWORD_LENGTH } from "./password-policy";

describe("validatePassword", () => {
  it("accepts a reasonable password", () => {
    expect(validatePassword("correct horse battery").valid).toBe(true);
  });

  it("requires a string", () => {
    expect(validatePassword(undefined).valid).toBe(false);
    expect(validatePassword(12345678).valid).toBe(false);
  });

  it(`rejects shorter than ${MIN_PASSWORD_LENGTH}`, () => {
    expect(validatePassword("a".repeat(MIN_PASSWORD_LENGTH - 1)).valid).toBe(false);
  });

  it("rejects overly long passwords", () => {
    expect(validatePassword("a".repeat(201)).valid).toBe(false);
  });

  it("rejects a single repeated character", () => {
    expect(validatePassword("aaaaaaaaaaaa").valid).toBe(false);
  });

  it("rejects common passwords", () => {
    expect(validatePassword("password123").valid).toBe(false);
    expect(validatePassword("qwertyuiop").valid).toBe(false);
  });
});
