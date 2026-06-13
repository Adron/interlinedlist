/**
 * Unit tests for the pure logic inside
 * components/settings/ConnectedAccountsSection.tsx.
 *
 * The component is a React client component that depends on Next.js router,
 * fetch, and DOM state — none of which are available in the node Vitest
 * environment.  We inline the three deterministic pieces added / changed in
 * the "personal LinkedIn pages" PR and lock them in:
 *
 *   1. linkedInPostingTargetKey  — stable checkbox key per target kind.
 *   2. logoSrc selection         — avatarUrl for personal, logoUrl for pages.
 *   3. kindLabel selection       — three-branch label: 'personal' | 'page' | 'company page'.
 */

import { describe, expect, it } from 'vitest';
import type { LinkedInPostingTargetOption } from '@/lib/types';

// ── inlined from components/settings/ConnectedAccountsSection.tsx ─────────────
// Keep these in sync with the source file.

function linkedInPostingTargetKey(target: LinkedInPostingTargetOption): string {
  if (target.kind === 'personal') return 'personal';
  return target.kind === 'orgPage' ? target.pageId : `personalPage-${target.personalPageId}`;
}

function logoSrcFor(target: LinkedInPostingTargetOption): string | null | undefined {
  return target.kind === 'personal' ? target.avatarUrl : target.logoUrl;
}

function kindLabelFor(target: LinkedInPostingTargetOption): string {
  return target.kind === 'personal'
    ? 'personal'
    : target.kind === 'orgPage'
      ? 'page'
      : 'company page';
}

// ── helpers ───────────────────────────────────────────────────────────────────

const personalTarget: LinkedInPostingTargetOption = {
  kind: 'personal',
  label: 'Jane Doe',
  avatarUrl: 'https://example.com/avatar.png',
  enabled: true,
};

const orgPageTarget: LinkedInPostingTargetOption = {
  kind: 'orgPage',
  pageId: 'org-page-uuid-1',
  linkedInPageId: 'li-page-123',
  label: 'Acme Corp',
  logoUrl: 'https://example.com/org-logo.png',
  enabled: true,
};

const personalPageTarget: LinkedInPostingTargetOption = {
  kind: 'personalPage',
  personalPageId: 'pp-uuid-1',
  linkedInPageId: 'li-page-777',
  label: 'My Company',
  logoUrl: 'https://example.com/my-logo.png',
  enabled: false,
};

const personalPageNoLogo: LinkedInPostingTargetOption = {
  kind: 'personalPage',
  personalPageId: 'pp-uuid-2',
  linkedInPageId: 'li-page-888',
  label: 'No Logo Co',
  logoUrl: null,
  enabled: true,
};

const personalNoAvatar: LinkedInPostingTargetOption = {
  kind: 'personal',
  label: 'John',
  avatarUrl: null,
  enabled: true,
};

// ── linkedInPostingTargetKey ──────────────────────────────────────────────────

describe('linkedInPostingTargetKey — personal', () => {
  it('returns the literal string "personal"', () => {
    expect(linkedInPostingTargetKey(personalTarget)).toBe('personal');
  });
});

describe('linkedInPostingTargetKey — orgPage', () => {
  it('returns the pageId directly', () => {
    expect(linkedInPostingTargetKey(orgPageTarget)).toBe('org-page-uuid-1');
  });

  it('is stable for different pageId values', () => {
    const other: LinkedInPostingTargetOption = {
      ...orgPageTarget,
      pageId: 'org-page-uuid-2',
    };
    expect(linkedInPostingTargetKey(other)).toBe('org-page-uuid-2');
  });
});

describe('linkedInPostingTargetKey — personalPage', () => {
  it('returns "personalPage-{personalPageId}"', () => {
    expect(linkedInPostingTargetKey(personalPageTarget)).toBe('personalPage-pp-uuid-1');
  });

  it('uses the personalPageId, not the linkedInPageId', () => {
    const other: LinkedInPostingTargetOption = {
      ...personalPageTarget,
      personalPageId: 'pp-uuid-99',
    };
    expect(linkedInPostingTargetKey(other)).toBe('personalPage-pp-uuid-99');
  });

  it('never collides with an orgPage that has the same id value', () => {
    const orgSameId: LinkedInPostingTargetOption = {
      ...orgPageTarget,
      pageId: 'pp-uuid-1',
    };
    expect(linkedInPostingTargetKey(orgSameId)).toBe('pp-uuid-1');
    expect(linkedInPostingTargetKey(personalPageTarget)).toBe('personalPage-pp-uuid-1');
    expect(linkedInPostingTargetKey(orgSameId)).not.toBe(linkedInPostingTargetKey(personalPageTarget));
  });
});

// ── logoSrc selection ─────────────────────────────────────────────────────────

describe('logoSrc — personal target uses avatarUrl', () => {
  it('returns avatarUrl when present', () => {
    expect(logoSrcFor(personalTarget)).toBe('https://example.com/avatar.png');
  });

  it('returns null when avatarUrl is null', () => {
    expect(logoSrcFor(personalNoAvatar)).toBeNull();
  });
});

describe('logoSrc — orgPage target uses logoUrl', () => {
  it('returns logoUrl for an orgPage', () => {
    expect(logoSrcFor(orgPageTarget)).toBe('https://example.com/org-logo.png');
  });

  it('returns null when logoUrl is null', () => {
    const noLogo: LinkedInPostingTargetOption = { ...orgPageTarget, logoUrl: null };
    expect(logoSrcFor(noLogo)).toBeNull();
  });
});

describe('logoSrc — personalPage target uses logoUrl', () => {
  it('returns logoUrl for a personalPage', () => {
    expect(logoSrcFor(personalPageTarget)).toBe('https://example.com/my-logo.png');
  });

  it('returns null when logoUrl is null', () => {
    expect(logoSrcFor(personalPageNoLogo)).toBeNull();
  });
});

describe('logoSrc — avatarUrl vs logoUrl distinction', () => {
  it('personal target never uses logoUrl', () => {
    // Even if a personal target hypothetically had both properties at runtime,
    // the ternary selects avatarUrl for personal.
    const mixed = {
      kind: 'personal' as const,
      label: 'Mixed',
      avatarUrl: 'avatar-url',
      // logoUrl is not part of the personal union variant — verified at type level
      enabled: true,
    } satisfies LinkedInPostingTargetOption;
    expect(logoSrcFor(mixed)).toBe('avatar-url');
  });

  it('orgPage target never uses avatarUrl', () => {
    expect(logoSrcFor(orgPageTarget)).toBe(orgPageTarget.logoUrl);
  });

  it('personalPage target never uses avatarUrl', () => {
    expect(logoSrcFor(personalPageTarget)).toBe(personalPageTarget.logoUrl);
  });
});

// ── kindLabel selection ───────────────────────────────────────────────────────

describe('kindLabel — personal', () => {
  it('returns "personal"', () => {
    expect(kindLabelFor(personalTarget)).toBe('personal');
  });
});

describe('kindLabel — orgPage', () => {
  it('returns "page"', () => {
    expect(kindLabelFor(orgPageTarget)).toBe('page');
  });
});

describe('kindLabel — personalPage', () => {
  it('returns "company page" (three-branch fix)', () => {
    expect(kindLabelFor(personalPageTarget)).toBe('company page');
  });

  it('returns "company page" regardless of enabled state', () => {
    expect(kindLabelFor({ ...personalPageTarget, enabled: false })).toBe('company page');
    expect(kindLabelFor({ ...personalPageTarget, enabled: true })).toBe('company page');
  });

  it('does NOT return the old two-branch value "page"', () => {
    expect(kindLabelFor(personalPageTarget)).not.toBe('page');
  });
});

describe('kindLabel — all three kinds are distinct', () => {
  it('produces three different strings for three different kinds', () => {
    const labels = [
      kindLabelFor(personalTarget),
      kindLabelFor(orgPageTarget),
      kindLabelFor(personalPageTarget),
    ];
    const unique = new Set(labels);
    expect(unique.size).toBe(3);
  });
});
