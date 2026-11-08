/** Public navigation configuration only. Never put CRM credentials here. */
export function crmWorkspaceUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    // Links go only to an operator-configured HTTPS login. No tokens, userinfo,
    // fragments or query strings can accidentally be carried into the browser.
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.hostname === "localhost" ||
      url.hostname.endsWith(".localhost") ||
      !url.hostname.includes(".")
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
