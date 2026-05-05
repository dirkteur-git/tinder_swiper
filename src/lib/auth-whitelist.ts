/**
 * Whitelist-check voor magic-link auth. Werkt aan zowel server- als client-side
 * — gebruikt alleen NEXT_PUBLIC_-vars zodat het in beide contexten beschikbaar is.
 */

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (!e) return false;

  const allowedEmails = parseList(process.env.NEXT_PUBLIC_ALLOWED_EMAILS);
  const allowedDomains = parseList(process.env.NEXT_PUBLIC_ALLOWED_DOMAINS);

  // Geen whitelist ingesteld → alles weigeren (fail-closed)
  if (allowedEmails.length === 0 && allowedDomains.length === 0) return false;

  if (allowedEmails.includes(e)) return true;

  const at = e.lastIndexOf("@");
  if (at < 0) return false;
  const domain = e.slice(at + 1);
  return allowedDomains.includes(domain);
}
