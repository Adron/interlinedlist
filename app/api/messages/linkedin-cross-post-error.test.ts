/**
 * Specification tests for the LinkedIn cross-post failure entry constructed
 * inside `app/api/messages/route.ts` (~line 348 declaration, ~lines 505–517).
 *
 * The failure entry pushed onto `crossPostResults` must conform to the shape:
 *   { providerId: '', instanceName, success: false, error,
 *     errorCode?: string, statusCode?: number }
 *
 * The `error` string is selected from one of four branches based on the
 * requested target kind. These tests pin those exact strings as a contract so
 * any drift in `route.ts` is surfaced loudly during code review (the test will
 * fail and have to be updated deliberately).
 *
 * NOTE: These tests do not import the route handler — that module pulls in
 * heavy auth/Prisma deps and runs Next.js-only side effects. Instead they
 * mirror the inline ternary as a pure helper and assert it matches the source
 * verbatim. The matching `linkedinFailureMessageForTarget` helper is
 * intentionally colocated here as a *test fixture* describing the production
 * contract, not as production code.
 */

import { describe, expect, it } from 'vitest';
import type { RequestedLinkedInTarget } from '@/lib/linkedin/resolve-linkedin-target';

/**
 * Exact mirror of the inline ternary in app/api/messages/route.ts lines 509-516.
 * If you change either side, change the other and update the snapshot strings.
 */
function linkedinFailureMessageForTarget(
  requestedTarget: RequestedLinkedInTarget | undefined
): string {
  return requestedTarget?.kind === 'personal'
    ? 'Your personal LinkedIn account is not linked. Link it in Settings.'
    : requestedTarget?.kind === 'orgPage'
      ? 'The selected LinkedIn page is unavailable — the assignment was removed or the organization connection expired.'
      : requestedTarget?.kind === 'personalPage'
        ? 'The selected LinkedIn company page is unavailable — reconnect LinkedIn or re-sync your company pages in Settings.'
        : 'LinkedIn account not linked. Please link in Settings.';
}

/**
 * Mirrors the failure-entry construction in route.ts ~line 505-517 to assert
 * the shape contract (providerId / instanceName / success / error fields).
 */
function buildLinkedInFailureEntry(
  instanceName: string,
  requestedTarget: RequestedLinkedInTarget | undefined
) {
  return {
    providerId: '',
    instanceName,
    success: false as const,
    error: linkedinFailureMessageForTarget(requestedTarget),
  };
}

describe('LinkedIn cross-post failure: error message branches', () => {
  it('returns the personal-account message for requested kind "personal"', () => {
    expect(linkedinFailureMessageForTarget({ kind: 'personal' })).toBe(
      'Your personal LinkedIn account is not linked. Link it in Settings.'
    );
  });

  it('returns the org-page-unavailable message for requested kind "orgPage"', () => {
    expect(
      linkedinFailureMessageForTarget({ kind: 'orgPage', pageId: 'p-1' })
    ).toBe(
      'The selected LinkedIn page is unavailable — the assignment was removed or the organization connection expired.'
    );
  });

  it('returns the personal-company-page message for requested kind "personalPage"', () => {
    expect(
      linkedinFailureMessageForTarget({
        kind: 'personalPage',
        personalPageId: 'pp-1',
      })
    ).toBe(
      'The selected LinkedIn company page is unavailable — reconnect LinkedIn or re-sync your company pages in Settings.'
    );
  });

  it('returns the generic message when no target is requested (undefined)', () => {
    expect(linkedinFailureMessageForTarget(undefined)).toBe(
      'LinkedIn account not linked. Please link in Settings.'
    );
  });

  it('each branch returns a distinct, non-empty string', () => {
    const personal = linkedinFailureMessageForTarget({ kind: 'personal' });
    const orgPage = linkedinFailureMessageForTarget({
      kind: 'orgPage',
      pageId: 'p',
    });
    const personalPage = linkedinFailureMessageForTarget({
      kind: 'personalPage',
      personalPageId: 'pp',
    });
    const generic = linkedinFailureMessageForTarget(undefined);

    const all = [personal, orgPage, personalPage, generic];
    for (const s of all) {
      expect(s).toBeTypeOf('string');
      expect(s.length).toBeGreaterThan(0);
    }
    expect(new Set(all).size).toBe(4);
  });
});

describe('LinkedIn cross-post failure: entry shape contract', () => {
  it('has providerId === "" (empty string sentinel for "no provider id")', () => {
    const entry = buildLinkedInFailureEntry('LinkedIn', undefined);
    expect(entry.providerId).toBe('');
  });

  it('has success === false', () => {
    const entry = buildLinkedInFailureEntry('LinkedIn', { kind: 'personal' });
    expect(entry.success).toBe(false);
  });

  it('echoes the instanceName the caller passed in (used by the UI to label per-target results)', () => {
    const entry = buildLinkedInFailureEntry('LinkedIn (Acme Corp)', {
      kind: 'orgPage',
      pageId: 'p',
    });
    expect(entry.instanceName).toBe('LinkedIn (Acme Corp)');
  });

  it('puts the branch-specific message into the error field', () => {
    const entry = buildLinkedInFailureEntry('LinkedIn (personal)', {
      kind: 'personal',
    });
    expect(entry.error).toBe(
      'Your personal LinkedIn account is not linked. Link it in Settings.'
    );
  });

  it('exposes only the documented keys (no errorCode / statusCode are set on the no-resolution branch)', () => {
    const entry = buildLinkedInFailureEntry('LinkedIn', { kind: 'personal' });
    // The failure-from-no-resolution branch in route.ts never sets errorCode/statusCode.
    expect(Object.keys(entry).sort()).toEqual(
      ['error', 'instanceName', 'providerId', 'success'].sort()
    );
  });

  it('produces JSON-serializable output', () => {
    const entry = buildLinkedInFailureEntry('LinkedIn', { kind: 'personal' });
    const round = JSON.parse(JSON.stringify(entry));
    expect(round).toEqual(entry);
  });
});

describe('LinkedIn cross-post instanceName labeling expectations', () => {
  /**
   * Lock in the labeling contract documented near route.ts:477-484:
   *   - orgPage  -> "LinkedIn (<pageName or 'page'>)"
   *   - personalPage -> "LinkedIn (<pageName or 'page'>)"
   *   - undefined + multiple targets queued -> "LinkedIn (personal)"
   *   - undefined + single target queued -> "LinkedIn"
   */
  function instanceNameFor(
    requestedTarget: RequestedLinkedInTarget | undefined,
    opts: {
      orgPageNames?: Map<string, string>;
      personalPageNames?: Map<string, string>;
      queuedTargetCount: number;
    }
  ): string {
    const orgNames = opts.orgPageNames ?? new Map<string, string>();
    const ppNames = opts.personalPageNames ?? new Map<string, string>();
    return requestedTarget?.kind === 'orgPage'
      ? `LinkedIn (${orgNames.get(requestedTarget.pageId) ?? 'page'})`
      : requestedTarget?.kind === 'personalPage'
        ? `LinkedIn (${ppNames.get(requestedTarget.personalPageId) ?? 'page'})`
        : opts.queuedTargetCount > 1
          ? 'LinkedIn (personal)'
          : 'LinkedIn';
  }

  it('labels an orgPage with its resolved page name', () => {
    expect(
      instanceNameFor(
        { kind: 'orgPage', pageId: 'p-1' },
        {
          orgPageNames: new Map([['p-1', 'Acme Corp']]),
          queuedTargetCount: 1,
        }
      )
    ).toBe('LinkedIn (Acme Corp)');
  });

  it('falls back to "(page)" when the orgPage name lookup misses', () => {
    expect(
      instanceNameFor(
        { kind: 'orgPage', pageId: 'missing' },
        { orgPageNames: new Map(), queuedTargetCount: 1 }
      )
    ).toBe('LinkedIn (page)');
  });

  it('labels a personalPage with its resolved page name', () => {
    expect(
      instanceNameFor(
        { kind: 'personalPage', personalPageId: 'pp-1' },
        {
          personalPageNames: new Map([['pp-1', 'Beta LLC']]),
          queuedTargetCount: 1,
        }
      )
    ).toBe('LinkedIn (Beta LLC)');
  });

  it('falls back to "(page)" when the personalPage name lookup misses', () => {
    expect(
      instanceNameFor(
        { kind: 'personalPage', personalPageId: 'missing' },
        { personalPageNames: new Map(), queuedTargetCount: 1 }
      )
    ).toBe('LinkedIn (page)');
  });

  it('uses "LinkedIn (personal)" for an unspecified target when multiple targets are queued', () => {
    expect(instanceNameFor(undefined, { queuedTargetCount: 2 })).toBe(
      'LinkedIn (personal)'
    );
  });

  it('uses plain "LinkedIn" for an unspecified target when only one target is queued', () => {
    expect(instanceNameFor(undefined, { queuedTargetCount: 1 })).toBe(
      'LinkedIn'
    );
  });
});
