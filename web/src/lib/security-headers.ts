export type HeaderEntry = { key: string; value: string };

/** Sent on every page. Script rules stay open because the theme and install banner use inline scripts. */
export function securityHeaders({ production }: { production: boolean }): HeaderEntry[] {
  const headers: HeaderEntry[] = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
    {
      key: "Content-Security-Policy",
      value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
    },
  ];
  if (production) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }
  return headers;
}

/** Hidden staff panels: never indexed by search engines, never leak their address to other sites. */
export const staffPanelHeaders: HeaderEntry[] = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cache-Control", value: "private, no-store" },
];
