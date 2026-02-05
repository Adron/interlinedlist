/**
 * Theme Bridge System
 * Syncs InterlinedList's data-theme attribute with Darkone's data-bs-theme attribute
 */

let isUpdatingTheme = false;

export function syncThemeAttributes(theme: string | null): void {
  if (typeof window === 'undefined') return;
  if (isUpdatingTheme) return; // Prevent infinite loops

  const root = document.documentElement;
  const themeValue = theme || 'system';
  let effectiveTheme: string;

  // If theme is 'system', detect OS preference
  if (themeValue === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveTheme = prefersDark ? 'dark' : 'light';
  } else {
    effectiveTheme = themeValue;
  }

  // Check if update is needed to prevent unnecessary DOM mutations
  const currentTheme = root.getAttribute('data-theme');
  const currentBsTheme = root.getAttribute('data-bs-theme');
  
  if (currentTheme === effectiveTheme && currentBsTheme === effectiveTheme) {
    return; // No change needed
  }

  isUpdatingTheme = true;
  
  // Set both theme attributes for compatibility
  root.setAttribute('data-theme', effectiveTheme);
  root.setAttribute('data-bs-theme', effectiveTheme);
  
  // Use requestAnimationFrame to ensure DOM updates complete
  requestAnimationFrame(() => {
    isUpdatingTheme = false;
  });
}

export function initializeThemeBridge(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Check localStorage first, then DOM attribute
  const storedTheme = localStorage.getItem('theme');
  const domTheme = document.documentElement.getAttribute('data-theme');
  const initialTheme = storedTheme || domTheme || 'system';
  
  // Initial sync with localStorage value (or DOM fallback)
  syncThemeAttributes(initialTheme);

  // Watch for changes to data-theme attribute (but ignore our own changes)
  const observer = new MutationObserver((mutations) => {
    if (isUpdatingTheme) return; // Ignore changes we're making
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        const newTheme = document.documentElement.getAttribute('data-theme');
        if (newTheme) {
          syncThemeAttributes(newTheme);
        }
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  // Also watch for system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'system' || !currentTheme) {
      syncThemeAttributes('system');
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleSystemThemeChange);
  }

  // Return cleanup function
  return () => {
    observer.disconnect();
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } else if (mediaQuery.removeListener) {
      mediaQuery.removeListener(handleSystemThemeChange);
    }
  };
}
