/** Only same-site relative paths: blocks open redirects via ?callbackUrl=https://evil.com */
export function safeRedirectPath(url: string | null | undefined, fallback = "/"): string {
  if (!url) return fallback;
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) return url;
  return fallback;
}
