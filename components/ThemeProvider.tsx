'use client';

import { useEffect } from 'react';
import { syncThemeAttributes } from '@/lib/theme/darkone-bridge';

interface ThemeProviderProps {
  theme?: string | null;
  children: React.ReactNode;
}

export default function ThemeProvider({ theme = 'system', children }: ThemeProviderProps) {
  useEffect(() => {
    // Use the bridge system to sync both theme attributes
    syncThemeAttributes(theme || 'system');

    // Listen for system preference changes if theme is 'system'
    const themeValue = theme || 'system';
    if (themeValue === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => syncThemeAttributes('system');
      
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

