import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// Determine APP_URL with proper fallbacks
function getAppUrl(): string {
  // Explicitly set URL takes precedence (allows manual override)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Vercel provides VERCEL_URL automatically in production
  // Format: your-app.vercel.app (without protocol)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Fallback to localhost for local development
  // Note: In production, NEXT_PUBLIC_APP_URL or VERCEL_URL should be set
  return 'http://localhost:3000';
}

export const APP_URL = getAppUrl();

