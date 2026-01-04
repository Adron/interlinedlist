import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ThemeProvider from '@/components/ThemeProvider';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'InterlinedList',
  description: 'Time-series based micro-blogging platform',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <ThemeProvider theme={user?.theme || 'system'}>
          <Navigation />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}

