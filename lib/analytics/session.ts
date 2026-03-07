/**
 * Analytics session cookie for anonymous visitors.
 * Cookie name: _as (analytics session)
 * 30-day expiry, SameSite=Lax, path=/
 */

export const ANALYTICS_SESSION_COOKIE = '_as';
export const ANALYTICS_SESSION_MAX_AGE_DAYS = 30;

export function generateAnalyticsSessionId(): string {
  return `as_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getAnalyticsSessionCookieOptions(): {
  name: string;
  value: string;
  maxAge: number;
  path: string;
  sameSite: 'lax';
  secure?: boolean;
} {
  return {
    name: ANALYTICS_SESSION_COOKIE,
    value: generateAnalyticsSessionId(),
    maxAge: ANALYTICS_SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  };
}
