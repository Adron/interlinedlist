import { describe, expect, it } from "vitest";
import {
  HELP_TOPICS,
  getHelpTopics,
  getAllHelpTopics,
  findHelpTopic,
} from "./help-config";

describe("HELP_TOPICS", () => {
  it("is a non-empty array", () => {
    expect(HELP_TOPICS.length).toBeGreaterThan(0);
  });

  it("every top-level topic has a non-empty slug and title", () => {
    for (const topic of HELP_TOPICS) {
      expect(topic.slug.length).toBeGreaterThan(0);
      expect(topic.title.length).toBeGreaterThan(0);
    }
  });

  it("contains the 'branding' topic", () => {
    const slugs = HELP_TOPICS.map((t) => t.slug);
    expect(slugs).toContain("branding");
  });

  it("contains core topics that must always exist", () => {
    const slugs = HELP_TOPICS.map((t) => t.slug);
    for (const required of ["getting-started", "messages", "settings", "api"]) {
      expect(slugs).toContain(required);
    }
  });

  it("has no duplicate top-level slugs", () => {
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

describe("nested API children", () => {
  const api = HELP_TOPICS.find((t) => t.slug === "api");

  it("has children under the 'api' topic", () => {
    expect(api?.children?.length).toBeGreaterThan(0);
  });

  it("every API child slug is prefixed with 'api/'", () => {
    for (const child of api?.children ?? []) {
      expect(child.slug.startsWith("api/")).toBe(true);
      expect(child.title.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate API child slugs", () => {
    const slugs = (api?.children ?? []).map((c) => c.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("getAllHelpTopics returns parents and their children", () => {
    const all = getAllHelpTopics();
    expect(all).toContain(api);
    for (const child of api?.children ?? []) {
      expect(all).toContain(child);
    }
  });

  it("findHelpTopic resolves a nested child by full slug", () => {
    const firstChild = api?.children?.[0];
    expect(firstChild).toBeDefined();
    if (firstChild) {
      expect(findHelpTopic(firstChild.slug)).toBe(firstChild);
    }
  });

  it("findHelpTopic resolves a top-level topic", () => {
    expect(findHelpTopic("api")).toBe(api);
  });

  it("findHelpTopic returns undefined for unknown slug", () => {
    expect(findHelpTopic("does-not-exist")).toBeUndefined();
  });
});
