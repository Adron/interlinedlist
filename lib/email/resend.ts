import { Resend } from 'resend';
import { APP_URL, FROM_EMAIL } from '@/lib/config/app';

// Lazy initialization to avoid errors during build
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    try {
      const result = getResend()[prop as keyof Resend];
      return result;
    } catch (error: any) {
      throw error;
    }
  }
});

export { FROM_EMAIL, APP_URL };

