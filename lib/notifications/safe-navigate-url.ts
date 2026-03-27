/**
 * Allow only same-origin relative paths for notification deep links (no protocol-relative or external URLs).
 */
export function isSafeAppPath(url: string | null | undefined): url is string {
  if (!url || typeof url !== 'string') return false;
  const t = url.trim();
  if (!t.startsWith('/')) return false;
  if (t.startsWith('//')) return false;
  return true;
}
