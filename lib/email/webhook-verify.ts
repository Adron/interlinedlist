import { createHmac, timingSafeEqual } from 'crypto';

const TOLERANCE_SECONDS = 300; // 5 minutes — reject replayed requests

export interface SvixHeaders {
  'svix-id': string | null;
  'svix-timestamp': string | null;
  'svix-signature': string | null;
}

export function verifyResendWebhook(
  payload: string,
  headers: SvixHeaders,
  secret: string
): { valid: boolean; reason?: string } {
  const msgId = headers['svix-id'];
  const msgTs = headers['svix-timestamp'];
  const msgSig = headers['svix-signature'];

  if (!msgId || !msgTs || !msgSig) {
    return { valid: false, reason: 'Missing svix headers' };
  }

  const ts = parseInt(msgTs, 10);
  if (isNaN(ts)) return { valid: false, reason: 'Invalid svix-timestamp' };

  const ageSeconds = Math.abs(Date.now() / 1000 - ts);
  if (ageSeconds > TOLERANCE_SECONDS) {
    return { valid: false, reason: `Timestamp too old (${Math.round(ageSeconds)}s)` };
  }

  // Decode signing secret: strip optional "whsec_" prefix then base64-decode
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  } catch {
    return { valid: false, reason: 'Could not decode webhook secret' };
  }

  // Signed content: "{svix-id}.{svix-timestamp}.{raw-body}"
  const toSign = `${msgId}.${msgTs}.${payload}`;
  const expectedB64 = createHmac('sha256', secretBytes).update(toSign).digest('base64');
  const expectedBuf = Buffer.from(expectedB64, 'base64');

  // svix-signature may contain multiple space-separated "v1,<base64>" entries (key rotation)
  const signatures = msgSig.split(' ').map((s) => s.replace(/^v1,/, ''));

  const matched = signatures.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, 'base64');
      if (sigBuf.length !== expectedBuf.length) return false;
      return timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });

  return matched ? { valid: true } : { valid: false, reason: 'Signature mismatch' };
}
