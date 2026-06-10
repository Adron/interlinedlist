import { describe, expect, it } from "vitest";
import { HELP_TOPICS, getHelpTopics } from "./help-config";

describe("HELP_TOPICS", () => {
  it("is a non-empty array", () => {
    expect(HELP_TOPICS.length).toBeGreaterThan(0);
  });

  it("every topic has a non-empty slug and title", () => {
    for (const topic of HELP_TOPICS) {
      expect(topic.slug.length).toBeGreaterThan(0);
      expect(topic.title.length).toBeGreaterThan(0);
    }
  });

  it("contains the 'branding' topic added in this PR", () => {
    const slugs = HELP_TOPICS.map((t) => t.slug);
    expect(slugs).toContain("branding");
  });

  it("contains core topics that must always exist", () => {
    const slugs = HELP_TOPICS.map((t) => t.slug);
    for (const required of ["getting-started", "messages", "settings", "api"]) {
      expect(slugs).toContain(required);
    }
  });

  it("has no duplicate slugs", () => {
    const slugs = HELP_TOPICS.map((t) => t.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });
});

describe("getHelpTopics", () => {
  it("returns the same reference as HELP_TOPICS", () => {
    expect(getHelpTopics()).toBe(HELP_TOPICS);
  });
});
