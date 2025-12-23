import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #e5e5e5',
        padding: '2rem',
        marginTop: '4rem',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <p style={{ color: '#666', margin: 0 }}>
            © {new Date().getFullYear()} InterlinedList. All rights reserved.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              color: '#666',
              textDecoration: 'none',
            }}
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            style={{
              color: '#666',
              textDecoration: 'none',
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            style={{
              color: '#666',
              textDecoration: 'none',
            }}
          >
            Settings
          </Link>
        </div>
      </div>
    </footer>
  );
}

