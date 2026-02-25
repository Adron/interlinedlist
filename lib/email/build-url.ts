import { APP_URL } from '@/lib/config/app';

/** Build an absolute app URL for email links. Prevents double slashes. */
export function buildAppUrl(path: string): string {
  const base = APP_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
