// Application configuration constants
// Values can be overridden via environment variables

export const APP_CONFIG = {
  // App metadata
  name: process.env.APP_NAME || 'InterlinedList',
  url: process.env.NEXT_PUBLIC_APP_URL || 
       (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  contactEmail: process.env.APP_CONTACT_EMAIL || 'contact@interlinedlist.com',
  
  // User-Agent for external API calls
  userAgent: process.env.APP_USER_AGENT || 
    `InterlinedList (${process.env.NEXT_PUBLIC_APP_URL || 'https://interlinedlist.com'}, ${process.env.APP_CONTACT_EMAIL || 'contact@interlinedlist.com'})`,
  
  // Session configuration
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME || 'session',
    maxAge: process.env.SESSION_MAX_AGE ? parseInt(process.env.SESSION_MAX_AGE) : 60 * 60 * 24 * 7, // 7 days
  },
  
  // Email configuration
  email: {
    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  },
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

// Convenience exports
export const APP_URL = APP_CONFIG.url;
export const FROM_EMAIL = APP_CONFIG.email.from;
export const SESSION_COOKIE_NAME = APP_CONFIG.session.cookieName;
export const SESSION_MAX_AGE = APP_CONFIG.session.maxAge;
export const USER_AGENT = APP_CONFIG.userAgent;
