const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254 || !EMAIL.test(email)) return null;
  return email;
}

export function normalizeDomainList(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parts = value
    .split(/[,;\s]+/)
    .map((part) => part.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  if (parts.length === 0) return "";
  const unique: string[] = [];
  for (const domain of parts) {
    if (domain.length > 253 || domain.includes("..") || !DOMAIN.test(domain)) return null;
    if (!unique.includes(domain)) unique.push(domain);
  }
  return unique.join(", ");
}

export function emailOnDomain(email: string, domains: string): boolean {
  const allowed = domains
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  const host = email.slice(email.lastIndexOf("@") + 1);
  return allowed.includes(host);
}

export function describeDomains(domains: string): string {
  const list = domains
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((domain) => `@${domain}`);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} or ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} or ${list[list.length - 1]}`;
}

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function requireText(value: unknown, max: number): string | null {
  const text = cleanText(value, max);
  return text.length > 0 ? text : null;
}
