/**
 * APNs HTTP/2 push notification delivery using JWT-based auth (p8 key).
 * Env vars required: APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY, APNS_BUNDLE_ID
 * Optional: APNS_PRODUCTION=true (defaults to sandbox)
 */

import { createSign } from "crypto";
import { prisma } from "@/lib/prisma";

type ApnsPayload = {
  aps: {
    alert: { title: string; body: string };
    badge?: number;
    sound?: string;
    "content-available"?: number;
  };
  [key: string]: unknown;
};

let cachedJwt: { token: string; issuedAt: number } | null = null;

function buildJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  // Reuse token for up to 55 minutes (APNs tokens expire at 60 min)
  if (cachedJwt && now - cachedJwt.issuedAt < 55 * 60) {
    return cachedJwt.token;
  }

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = (process.env.APNS_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

  if (!keyId || !teamId || !privateKey) {
    throw new Error("APNs env vars not configured (APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY)");
  }

  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({ iss: teamId, iat: now })).toString("base64url");
  const signingInput = `${header}.${claims}`;

  const sign = createSign("SHA256");
  sign.update(signingInput);
  const sig = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }, "base64url");

  const token = `${signingInput}.${sig}`;
  cachedJwt = { token, issuedAt: now };
  return token;
}

async function sendToToken(
  deviceToken: string,
  payload: ApnsPayload,
  bundleId: string,
  host: string
): Promise<{ ok: boolean; status: number }> {
  const jwt = buildJwt();
  const body = JSON.stringify(payload);

  const res = await fetch(`https://${host}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body,
  });

  return { ok: res.ok, status: res.status };
}

/**
 * Send a push notification to all registered iOS device tokens for a user.
 * Automatically removes tokens that APNs reports as unregistered (410 Gone).
 */
export async function sendPushToUser(
  userId: string,
  notification: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  const bundleId = process.env.APNS_BUNDLE_ID;
  if (!bundleId) return;

  const isProduction = process.env.APNS_PRODUCTION === "true";
  const host = isProduction ? "api.push.apple.com" : "api.sandbox.push.apple.com";

  const tokens = await prisma.deviceToken.findMany({
    where: { userId, platform: "ios" },
    select: { id: true, token: true },
  });

  if (tokens.length === 0) return;

  const payload: ApnsPayload = {
    aps: {
      alert: { title: notification.title, body: notification.body },
      sound: "default",
    },
    ...(notification.data ?? {}),
  };

  const staleIds: string[] = [];

  await Promise.all(
    tokens.map(async ({ id, token }) => {
      try {
        const { status } = await sendToToken(token, payload, bundleId, host);
        if (status === 410) {
          staleIds.push(id);
        }
      } catch {
        // Network errors are non-fatal — push is best-effort
      }
    })
  );

  if (staleIds.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { id: { in: staleIds } } });
  }
}
