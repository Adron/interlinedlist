'use client';

import { useEffect } from 'react';

interface ThemeProviderProps {
  theme?: string | null;
  children: React.ReactNode;
}

export default function ThemeProvider({ theme = 'system', children }: ThemeProviderProps) {
  useEffect(() => {
    const applyTheme = () => {
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

      // Apply theme via data attribute
      root.setAttribute('data-theme', effectiveTheme);
    };

    // Apply theme immediately
    applyTheme();

    // Listen for system preference changes if theme is 'system'
    const themeValue = theme || 'system';
    if (themeValue === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      
      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } 
      // Fallback for older browsers
      else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [theme]);

  return <>{children}</>;
}

