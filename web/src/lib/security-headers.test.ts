import { describe, expect, it } from "vitest";
import { securityHeaders, staffPanelHeaders } from "./security-headers";
import { showSampleHints } from "./sample-hints";

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
    expect(showSampleHints("development")).toBe(true);
    expect(showSampleHints("test")).toBe(true);
    expect(showSampleHints("production")).toBe(false);
  });
});
