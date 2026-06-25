import { describe, it, expect } from "vitest";
import { isBlockedIp, assertUrlAllowed, SsrfError } from "./ssrf";

describe("isBlockedIp", () => {
  it("blocks private / loopback / link-local / metadata IPv4", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.5",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254", // cloud metadata
      "100.64.0.1", // CGNAT
      "0.0.0.0",
      "224.0.0.1", // multicast
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("allows public IPv4", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("blocks loopback / ULA / link-local IPv6 and mapped private v4", () => {
    for (const ip of ["::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("treats non-IP input as blocked", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
  });
});

describe("assertUrlAllowed", () => {
  it("rejects non-http(s) schemes", async () => {
    await expect(assertUrlAllowed("ftp://example.com")).rejects.toBeInstanceOf(SsrfError);
    await expect(assertUrlAllowed("file:///etc/passwd")).rejects.toBeInstanceOf(SsrfError);
  });

  it("rejects localhost and private IP literals", async () => {
    await expect(assertUrlAllowed("http://localhost/x")).rejects.toBeInstanceOf(SsrfError);
    await expect(assertUrlAllowed("http://169.254.169.254/latest/meta-data/")).rejects.toBeInstanceOf(SsrfError);
    await expect(assertUrlAllowed("http://10.0.0.1/")).rejects.toBeInstanceOf(SsrfError);
    await expect(assertUrlAllowed("http://[::1]/")).rejects.toBeInstanceOf(SsrfError);
  });

  it("allows a public IP literal without DNS", async () => {
    const url = await assertUrlAllowed("https://8.8.8.8/favicon.ico");
    expect(url.hostname).toBe("8.8.8.8");
  });
});
