/** Sample accounts, codes and staff links are shown only outside a production build. */
export function showSampleHints(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv !== "production";
}
