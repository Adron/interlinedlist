'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
}

export function Avatar({ src, alt, size = 80 }: AvatarProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return null;
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        style={{
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid #ddd',
          backgroundColor: '#fff',
        }}
        onError={() => setError(true)}
        unoptimized
      />
    </div>
  );
}

