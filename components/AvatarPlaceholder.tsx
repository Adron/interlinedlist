interface AvatarPlaceholderProps {
  name: string;
  size?: number;
  className?: string;
}

export default function AvatarPlaceholder({ 
  name, 
  size = 48,
  className = '' 
}: AvatarPlaceholderProps) {
  const initial = name[0].toUpperCase();
  const fontSize = size * 0.5; // Font size proportional to avatar size

  return (
    <div
      className={`rounded-circle d-flex align-items-center justify-content-center ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: 'var(--bs-secondary)',
        color: 'white',
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

