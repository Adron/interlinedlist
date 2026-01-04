'use client';

import { useEffect } from 'react';
import { initializeThemeBridge } from '@/lib/theme/darkone-bridge';

export default function ThemeBridgeInit() {
  useEffect(() => {
    const cleanup = initializeThemeBridge();
    return cleanup; // Cleanup on unmount
  }, []);

  return null;
}

