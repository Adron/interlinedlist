import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../styles/darkone.scss';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ThemeProvider from '@/components/ThemeProvider';
import ThemeBridgeInit from '@/components/ThemeBridgeInit';
import AppSidebar from '@/components/AppSidebar';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'InterlinedList',
  description: 'Time-series based micro-blogging platform',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/logo-icon-light.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/logo-icon-light.svg', type: 'image/svg+xml' },
    ],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Play:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, minHeight: '100vh' }}>
        <ThemeBridgeInit />
        <ThemeProvider theme={user?.theme || 'system'}>
          <div className="app-wrapper">
            <AppSidebar />
            <Navigation />
            <main className="page-content">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

