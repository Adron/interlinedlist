/**
 * Unit tests for the pure logic inside components/MessageInput.tsx.
 *
 * MessageInput is a React client component with extensive browser-API usage
 * (Canvas, File, URL.createObjectURL, fetch, window events).  We inline the
 * pure, deterministic module-level helpers and verify their contracts.
 *
 * Functions covered:
 *   linkedInOptionKey         — stable key per LinkedInTargetOption kind.
 *   linkedInRequestedKey      — stable key per RequestedLinkedInTarget kind.
 *   linkedInOptionToRequested — converts a LinkedInTargetOption to the wire shape.
 *   defaultLinkedInTargets    — picks the default selection from an enabled list.
 *   kindLabel ternary         — three-branch label fix for personalPage → 'company page'.
 */

import { describe, expect, it } from 'vitest';
import type { LinkedInTargetOption } from '@/lib/types';
import type { RequestedLinkedInTarget } from '@/lib/linkedin/resolve-linkedin-target';

// ── inlined from components/MessageInput.tsx ──────────────────────────────────
// Keep these in sync with the source file.

function linkedInOptionKey(option: LinkedInTargetOption): string {
  if (option.kind === 'personal') return 'personal';
  return option.kind === 'orgPage' ? option.pageId : `personalPage-${option.personalPageId}`;
}

function linkedInRequestedKey(target: RequestedLinkedInTarget): string {
  if (target.kind === 'personal') return 'personal';
  return target.kind === 'orgPage' ? target.pageId : `personalPage-${target.personalPageId}`;
}

function linkedInOptionToRequested(option: LinkedInTargetOption): RequestedLinkedInTarget {
  if (option.kind === 'personal') return { kind: 'personal' };
  return option.kind === 'orgPage'
    ? { kind: 'orgPage', pageId: option.pageId }
    : { kind: 'personalPage', personalPageId: option.personalPageId };
}

function defaultLinkedInTargets(targets: LinkedInTargetOption[]): RequestedLinkedInTarget[] {
  if (targets.some((t) => t.kind === 'personal')) return [{ kind: 'personal' }];
  const firstPage = targets.find(
    (t): t is Extract<LinkedInTargetOption, { kind: 'orgPage' }> => t.kind === 'orgPage'
  );
  if (firstPage) return [{ kind: 'orgPage', pageId: firstPage.pageId }];
  const firstPersonalPage = targets.find(
    (t): t is Extract<LinkedInTargetOption, { kind: 'personalPage' }> =>
      t.kind === 'personalPage'
  );
  return firstPersonalPage
    ? [{ kind: 'personalPage', personalPageId: firstPersonalPage.personalPageId }]
    : [];
}

function kindLabel(t: LinkedInTargetOption): string {
  return t.kind === 'personal'
    ? 'personal'
    : t.kind === 'personalPage'
      ? 'company page'
      : 'page';
}

// ── fixtures ──────────────────────────────────────────────────────────────────

const personal: LinkedInTargetOption = {
  kind: 'personal',
  label: 'Jane Doe',
  avatarUrl: 'https://example.com/avatar.png',
};

const orgPage: LinkedInTargetOption = {
  kind: 'orgPage',
  pageId: 'org-page-uuid-1',
  linkedInPageId: 'li-page-123',
  label: 'Acme Corp',
  logoUrl: null,
};

const personalPage: LinkedInTargetOption = {
  kind: 'personalPage',
  personalPageId: 'pp-uuid-1',
  linkedInPageId: 'li-page-777',
  label: 'My Company',
  logoUrl: 'https://example.com/logo.png',
};

// ── linkedInOptionKey ─────────────────────────────────────────────────────────

describe('linkedInOptionKey', () => {
  it('returns "personal" for a personal target', () => {
    expect(linkedInOptionKey(personal)).toBe('personal');
  });

  it('returns the pageId for an orgPage target', () => {
    expect(linkedInOptionKey(orgPage)).toBe('org-page-uuid-1');
  });

  it('returns "personalPage-{personalPageId}" for a personalPage target', () => {
    expect(linkedInOptionKey(personalPage)).toBe('personalPage-pp-uuid-1');
  });

  it('does not collide between orgPage and personalPage sharing the same id string', () => {
    const org2: LinkedInTargetOption = { ...orgPage, pageId: 'pp-uuid-1' };
    expect(linkedInOptionKey(org2)).toBe('pp-uuid-1');
    expect(linkedInOptionKey(personalPage)).toBe('personalPage-pp-uuid-1');
    expect(linkedInOptionKey(org2)).not.toBe(linkedInOptionKey(personalPage));
  });
});

// ── linkedInRequestedKey ──────────────────────────────────────────────────────

describe('linkedInRequestedKey', () => {
  it('returns "personal" for { kind: "personal" }', () => {
    expect(linkedInRequestedKey({ kind: 'personal' })).toBe('personal');
  });

  it('returns the pageId for { kind: "orgPage", pageId }', () => {
    expect(linkedInRequestedKey({ kind: 'orgPage', pageId: 'p1' })).toBe('p1');
  });

  it('returns "personalPage-{personalPageId}" for { kind: "personalPage", personalPageId }', () => {
    expect(linkedInRequestedKey({ kind: 'personalPage', personalPageId: 'pp-42' })).toBe(
      'personalPage-pp-42'
    );
  });
});

describe('linkedInOptionKey / linkedInRequestedKey round-trip', () => {
  it('option key and requested key agree for personal', () => {
    const req = linkedInOptionToRequested(personal);
    expect(linkedInOptionKey(personal)).toBe(linkedInRequestedKey(req));
  });

  it('option key and requested key agree for orgPage', () => {
    const req = linkedInOptionToRequested(orgPage);
    expect(linkedInOptionKey(orgPage)).toBe(linkedInRequestedKey(req));
  });

  it('option key and requested key agree for personalPage', () => {
    const req = linkedInOptionToRequested(personalPage);
    expect(linkedInOptionKey(personalPage)).toBe(linkedInRequestedKey(req));
  });
});

// ── linkedInOptionToRequested ─────────────────────────────────────────────────

describe('linkedInOptionToRequested', () => {
  it('converts personal to { kind: "personal" }', () => {
    expect(linkedInOptionToRequested(personal)).toEqual({ kind: 'personal' });
  });

  it('converts orgPage to { kind: "orgPage", pageId }', () => {
    expect(linkedInOptionToRequested(orgPage)).toEqual({
      kind: 'orgPage',
      pageId: 'org-page-uuid-1',
    });
  });

  it('converts personalPage to { kind: "personalPage", personalPageId }', () => {
    expect(linkedInOptionToRequested(personalPage)).toEqual({
      kind: 'personalPage',
      personalPageId: 'pp-uuid-1',
    });
  });

  it('strips display-only fields (label, logoUrl, etc.) from the result', () => {
    const result = linkedInOptionToRequested(personalPage);
    expect(result).not.toHaveProperty('label');
    expect(result).not.toHaveProperty('logoUrl');
    expect(result).not.toHaveProperty('linkedInPageId');
  });
});

// ── defaultLinkedInTargets ────────────────────────────────────────────────────

describe('defaultLinkedInTargets — empty list', () => {
  it('returns an empty array when no targets are available', () => {
    expect(defaultLinkedInTargets([])).toEqual([]);
  });
});

describe('defaultLinkedInTargets — personal wins when present', () => {
  it('selects personal when the list contains only personal', () => {
    expect(defaultLinkedInTargets([personal])).toEqual([{ kind: 'personal' }]);
  });

  it('selects personal even when orgPage also exists', () => {
    expect(defaultLinkedInTargets([personal, orgPage])).toEqual([{ kind: 'personal' }]);
  });

  it('selects personal even when personalPage also exists', () => {
    expect(defaultLinkedInTargets([personal, personalPage])).toEqual([{ kind: 'personal' }]);
  });

  it('selects personal even when all three kinds are present', () => {
    expect(defaultLinkedInTargets([personal, orgPage, personalPage])).toEqual([
      { kind: 'personal' },
    ]);
  });

  it('selects personal when it appears after pages in the list', () => {
    expect(defaultLinkedInTargets([orgPage, personal])).toEqual([{ kind: 'personal' }]);
  });
});

describe('defaultLinkedInTargets — orgPage fallback', () => {
  it('selects the first orgPage when no personal target exists', () => {
    expect(defaultLinkedInTargets([orgPage])).toEqual([
      { kind: 'orgPage', pageId: 'org-page-uuid-1' },
    ]);
  });

  it('selects the first orgPage when both orgPage and personalPage exist (no personal)', () => {
    expect(defaultLinkedInTargets([orgPage, personalPage])).toEqual([
      { kind: 'orgPage', pageId: 'org-page-uuid-1' },
    ]);
  });

  it('selects the first (earlier-index) orgPage when multiple org pages exist', () => {
    const secondOrg: LinkedInTargetOption = {
      kind: 'orgPage',
      pageId: 'org-page-uuid-2',
      linkedInPageId: 'li-page-200',
      label: 'Beta Corp',
      logoUrl: null,
    };
    expect(defaultLinkedInTargets([orgPage, secondOrg])).toEqual([
      { kind: 'orgPage', pageId: 'org-page-uuid-1' },
    ]);
  });
});

describe('defaultLinkedInTargets — personalPage last-resort fallback', () => {
  it('selects the first personalPage when no personal and no orgPage exist', () => {
    expect(defaultLinkedInTargets([personalPage])).toEqual([
      { kind: 'personalPage', personalPageId: 'pp-uuid-1' },
    ]);
  });

  it('selects the first personalPage when multiple personalPages exist (no personal/orgPage)', () => {
    const secondPP: LinkedInTargetOption = {
      kind: 'personalPage',
      personalPageId: 'pp-uuid-2',
      linkedInPageId: 'li-page-888',
      label: 'Second Co',
      logoUrl: null,
    };
    expect(defaultLinkedInTargets([personalPage, secondPP])).toEqual([
      { kind: 'personalPage', personalPageId: 'pp-uuid-1' },
    ]);
  });
});

// ── kindLabel ternary (compose + schedule modals) ─────────────────────────────

describe('kindLabel — personal', () => {
  it('returns "personal"', () => {
    expect(kindLabel(personal)).toBe('personal');
  });
});

describe('kindLabel — orgPage', () => {
  it('returns "page"', () => {
    expect(kindLabel(orgPage)).toBe('page');
  });
});

describe('kindLabel — personalPage (three-branch fix)', () => {
  it('returns "company page"', () => {
    expect(kindLabel(personalPage)).toBe('company page');
  });

  it('does NOT return the old two-branch fallback "page"', () => {
    expect(kindLabel(personalPage)).not.toBe('page');
  });
});

describe('kindLabel — all three kinds produce distinct labels', () => {
  it('personal, orgPage, and personalPage each get a unique string', () => {
    const labels = new Set([kindLabel(personal), kindLabel(orgPage), kindLabel(personalPage)]);
    expect(labels.size).toBe(3);
  });
});
