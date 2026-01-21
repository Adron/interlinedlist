import { Resend } from 'resend';

// Lazy initialization to avoid errors during build
let resendInstance: Resend | null = null;

function getResend(): Resend {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6d7b0182-ed1e-48d0-aaac-1eb388eba3d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/email/resend.ts:getResend:entry',message:'getResend called',data:{hasInstance:!!resendInstance,hasApiKey:!!process.env.RESEND_API_KEY,apiKeyLength:process.env.RESEND_API_KEY?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  if (!resendInstance) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6d7b0182-ed1e-48d0-aaac-1eb388eba3d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/email/resend.ts:getResend:before-check',message:'Checking API key before initialization',data:{apiKeyExists:!!process.env.RESEND_API_KEY,nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!process.env.RESEND_API_KEY) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6d7b0182-ed1e-48d0-aaac-1eb388eba3d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/email/resend.ts:getResend:error-throw',message:'Throwing error - API key not set',data:{error:'RESEND_API_KEY environment variable is not set'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6d7b0182-ed1e-48d0-aaac-1eb388eba3d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/email/resend.ts:getResend:initializing',message:'Initializing Resend instance',data:{apiKeyLength:process.env.RESEND_API_KEY?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6d7b0182-ed1e-48d0-aaac-1eb388eba3d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/email/resend.ts:getResend:exit',message:'Returning Resend instance',data:{hasInstance:!!resendInstance},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  return resendInstance;
}

export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6d7b0182-ed1e-48d0-aaac-1eb388eba3d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/email/resend.ts:proxy-get',message:'Proxy getter accessed',data:{property:String(prop)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      const result = getResend()[prop as keyof Resend];
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6d7b0182-ed1e-48d0-aaac-1eb388eba3d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/email/resend.ts:proxy-get:success',message:'Proxy getter succeeded',data:{property:String(prop)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return result;
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6d7b0182-ed1e-48d0-aaac-1eb388eba3d8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/email/resend.ts:proxy-get:error',message:'Proxy getter error',data:{property:String(prop),error:error?.message,errorType:error?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      throw error;
    }
  }
});

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

