'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  iconOnly?: boolean;
}

const sizeMap = {
  small: 24,
  medium: 32,
  large: 48,
};

export default function Logo({ size = 'medium', showText = false, iconOnly = false }: LogoProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTheme = () => {
      const root = document.documentElement;
      const currentTheme = root.getAttribute('data-theme');
      setTheme(currentTheme === 'dark' ? 'dark' : 'light');
    };

    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    // Return a placeholder to avoid hydration mismatch
    return (
      <div style={{ width: sizeMap[size], height: sizeMap[size], display: 'inline-block' }} />
    );
  }

  const logoPath = iconOnly
    ? `/logo-icon-${theme}.svg`
    : `/logo-${theme}.svg`;

  const logoSize = sizeMap[size];

  if (showText && !iconOnly) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.75rem' }}>
        <Image
          src={logoPath}
          alt="InterlinedList Logo"
          width={logoSize}
          height={logoSize}
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: size === 'small' ? '1rem' : size === 'medium' ? '1.25rem' : '1.5rem',
            fontWeight: 'bold',
            color: 'var(--color-text)',
            whiteSpace: 'nowrap',
          }}
        >
          InterlinedList
        </span>
      </div>
    );
  }

  return (
    <Image
      src={logoPath}
      alt="InterlinedList Logo"
      width={logoSize}
      height={logoSize}
    />
  );
}

