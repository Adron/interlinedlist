/**
 * Regression tests for getCurrentUser() session resolution.
 *
 * The headline test (C1) locks in the fix for the authentication-bypass where a
 * cookie value equal to a *user ID* (UUIDs, same shape as session IDs) was
 * treated as a "legacy" credential and a real session was minted for it —
 * allowing full account takeover. getCurrentUser() must now only ever accept a
 * value that resolves to a real Session row.
 *
 * Mocks:
 *  - next/headers   — controls the session cookie value / observes cookie writes
 *  - @/lib/prisma   — prevents real DB calls
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    administrator: { findUnique: vi.fn() },
  },
}));

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/config/app";
import { getCurrentUser } from "./session";

const USER_ID = "11111111-2222-3333-4444-555555555555";
const SESSION_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function mockCookieStore(value: string | undefined) {
  const store = {
    get: vi.fn((name: string) =>
      name === SESSION_COOKIE_NAME && value !== undefined ? { value } : undefined
    ),
    set: vi.fn(),
    delete: vi.fn(),
  };
  (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(store);
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.session.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUser — legacy userId bypass is closed (C1)", () => {
  it("returns null when the cookie holds a userId instead of a session id", async () => {
    mockCookieStore(USER_ID);
    // No session exists with that id (it's a user id, not a session id).
    (prisma.session.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    // A real user DOES exist with that id — the old code would have looked this up.
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: USER_ID,
      email: "victim@example.com",
      username: "victim",
    });

    const result = await getCurrentUser();

    expect(result).toBeNull();
    // The bypass minted a session and looked up the user by id — neither must happen now.
    expect(prisma.session.create).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("getCurrentUser — valid session still authenticates", () => {
  it("returns the user for a valid, unexpired session id", async () => {
    mockCookieStore(SESSION_ID);
    (prisma.session.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: SESSION_ID,
      userId: USER_ID,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: USER_ID, email: "real@example.com", username: "real" },
    });
    (prisma.administrator.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getCurrentUser();

    expect(result).not.toBeNull();
    expect(result?.id).toBe(USER_ID);
    expect(result?.isAdministrator).toBe(false);
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  it("returns null when there is no session cookie at all", async () => {
    mockCookieStore(undefined);

    const result = await getCurrentUser();

    expect(result).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.session.create).not.toHaveBeenCalled();
  });
});
