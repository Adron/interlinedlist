import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'InterlinedList',
  description: 'Time-series based micro-blogging platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

