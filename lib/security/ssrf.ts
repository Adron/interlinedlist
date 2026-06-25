/**
 * SSRF protection for server-side fetches of user-supplied URLs.
 *
 * Blocks requests to private / loopback / link-local / reserved IP ranges
 * (including the cloud metadata address 169.254.169.254) and re-validates every
 * redirect hop, so a public host cannot 30x-bounce into an internal target.
 *
 * Node runtime only (uses dns/promises). Do not import from client components.
 */

import { lookup } from "dns/promises";
import { isIP } from "net";

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable ⇒ treat as unsafe
  const inRange = (base: string, maskBits: number) => {
    const baseInt = ipv4ToInt(base)!;
    const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
    return (n & mask) === (baseInt & mask);
  };
  return (
    inRange("0.0.0.0", 8) || // "this" network
    inRange("10.0.0.0", 8) || // private
    inRange("100.64.0.0", 10) || // CGNAT
    inRange("127.0.0.0", 8) || // loopback
    inRange("169.254.0.0", 16) || // link-local (incl. 169.254.169.254 metadata)
    inRange("172.16.0.0", 12) || // private
    inRange("192.0.0.0", 24) || // IETF protocol assignments
    inRange("192.0.2.0", 24) || // TEST-NET-1
    inRange("192.168.0.0", 16) || // private
    inRange("198.18.0.0", 15) || // benchmarking
    inRange("198.51.100.0", 24) || // TEST-NET-2
    inRange("203.0.113.0", 24) || // TEST-NET-3
    inRange("224.0.0.0", 4) || // multicast
    inRange("240.0.0.0", 4) // reserved / broadcast
  );
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0]; // strip zone id
  if (addr === "::1" || addr === "::") return true; // loopback / unspecified
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible — check the embedded v4.
  const mapped = addr.match(/(?:::ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  const first = addr.split(":")[0] ?? "";
  const hextet = parseInt(first || "0", 16);
  if (Number.isNaN(hextet)) return true;
  if ((hextet & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((hextet & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((hextet & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

/** True if the given IP literal is in a blocked (non-public) range. */
export function isBlockedIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return true; // not a valid IP ⇒ unsafe
}

/**
 * Validate a URL and resolve its host, throwing SsrfError if the scheme is not
 * http(s) or if any resolved address is in a blocked range. Returns the parsed URL.
 */
export async function assertUrlAllowed(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("URL must be http or https");
  }

  const host = url.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (!host || host.toLowerCase() === "localhost") {
    throw new SsrfError("Host is not allowed");
  }

  if (isIP(host)) {
    if (isBlockedIp(host)) throw new SsrfError("Host resolves to a blocked address");
    return url;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new SsrfError("Host could not be resolved");
  }
  if (addresses.length === 0) throw new SsrfError("Host could not be resolved");
  for (const { address } of addresses) {
    if (isBlockedIp(address)) throw new SsrfError("Host resolves to a blocked address");
  }
  return url;
}

/**
 * fetch() with SSRF protection: validates the target (and every redirect hop)
 * against the private-range blocklist. Redirects are followed manually so an
 * allowed host cannot bounce to an internal one.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  options: { maxRedirects?: number } = {}
): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? 4;
  let current = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertUrlAllowed(current);
    const response = await fetch(url, { ...init, redirect: "manual" });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return response;
      current = new URL(location, url).toString();
      continue;
    }
    return response;
  }
  throw new SsrfError("Too many redirects");
}
