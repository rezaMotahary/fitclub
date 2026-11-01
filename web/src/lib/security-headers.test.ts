import { describe, expect, it } from "vitest";
import { securityHeaders, staffPanelHeaders } from "./security-headers";
import { showSampleHints, siteOrigin } from "./sample-hints";

function valueOf(headers: { key: string; value: string }[], key: string) {
  return headers.find((h) => h.key === key)?.value;
}

describe("securityHeaders", () => {
  it("blocks framing and content sniffing everywhere", () => {
    const headers = securityHeaders({ production: false });
    expect(valueOf(headers, "X-Frame-Options")).toBe("DENY");
    expect(valueOf(headers, "X-Content-Type-Options")).toBe("nosniff");
    expect(valueOf(headers, "Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("forces https only on the live build", () => {
    expect(valueOf(securityHeaders({ production: false }), "Strict-Transport-Security")).toBeUndefined();
    expect(valueOf(securityHeaders({ production: true }), "Strict-Transport-Security")).toMatch(
      /max-age=\d+/,
    );
  });

  it("keeps hidden staff panels out of search engines and referrers", () => {
    expect(valueOf(staffPanelHeaders, "X-Robots-Tag")).toContain("noindex");
    expect(valueOf(staffPanelHeaders, "Referrer-Policy")).toBe("no-referrer");
  });
});

describe("showSampleHints", () => {
  it("shows sample accounts locally and hides them on the live build", () => {
    expect(showSampleHints("development", undefined)).toBe(true);
    expect(showSampleHints("test", undefined)).toBe(true);
    expect(showSampleHints("production", undefined)).toBe(false);
    expect(showSampleHints("production", "false")).toBe(false);
  });

  it("shows them on a demo server when demo mode is on", () => {
    expect(showSampleHints("production", "true")).toBe(true);
    expect(showSampleHints("production", " TRUE ")).toBe(true);
  });
});

describe("siteOrigin", () => {
  it("uses the configured address without a trailing slash", () => {
    expect(siteOrigin("https://demo.fitclub.ir/")).toBe("https://demo.fitclub.ir");
  });

  it("falls back to the local address", () => {
    expect(siteOrigin(undefined)).toBe("http://localhost:3000");
    expect(siteOrigin("  ")).toBe("http://localhost:3000");
  });
});
