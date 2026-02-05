/**
 * Theme Sync Utility
 * Provides a single source of truth for theme operations
 * Syncs theme between database, localStorage, and DOM
 */

import { syncThemeAttributes } from './darkone-bridge';

/**
 * Sync theme to localStorage and DOM
 */
export function syncThemeToStorage(theme: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('theme', theme);
  syncThemeAttributes(theme);
}

/**
 * Get stored theme from localStorage
 */
export function getStoredTheme(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('theme');
}
