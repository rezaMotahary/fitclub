/**
 * Sample accounts, codes and staff links are shown outside a production build,
 * or on a public test / teaching server with NEXT_PUBLIC_DEMO_MODE=true (owner decision 1404/08/10).
 */
export function showSampleHints(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  demoMode: string | undefined = process.env.NEXT_PUBLIC_DEMO_MODE,
): boolean {
  const demo = demoMode?.trim().toLowerCase();
  return nodeEnv !== "production" || demo === "true" || demo === "1" || demo === "yes";
}

/** Address printed on the how-to-open page. */
export function siteOrigin(
  raw: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
): string {
  return raw?.trim().replace(/\/$/, "") || "http://localhost:3000";
}
