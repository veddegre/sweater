import crypto from "node:crypto";
import fs from "node:fs";
import { cookies } from "next/headers";
import { dataDir } from "@/lib/paths";

const ADMIN_COOKIE = "sweater_admin";
const VOTER_COOKIE = "sweater_voter";
const ADMIN_MAX_AGE = 60 * 60 * 24 * 7;
const VOTER_MAX_AGE = 60 * 60 * 24 * 45;

type AdminToken = { role: string; exp: number };
type VoterToken = { voterId: string; entryId: string; exp: number };

let loginFailures = 0;
let loginLockedUntil = 0;

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = `${dataDir}/session.secret`;
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  fs.mkdirSync(dataDir, { recursive: true });
  const generated = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(file, generated, { mode: 0o600 });
  return generated;
}

export function sign(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verify<T>(token: string | undefined): T | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp?: number };
    if (typeof data.exp === "number" && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || !input) return false;
  const left = crypto.createHash("sha256").update(input).digest();
  const right = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(left, right);
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function loginLockMessage(): string | null {
  if (Date.now() >= loginLockedUntil) return null;
  const minutes = Math.max(1, Math.ceil((loginLockedUntil - Date.now()) / 60000));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export function noteLoginFailure(): void {
  loginFailures += 1;
  if (loginFailures >= 8) {
    loginLockedUntil = Date.now() + 10 * 60 * 1000;
    loginFailures = 0;
  }
}

export function noteLoginSuccess(): void {
  loginFailures = 0;
  loginLockedUntil = 0;
}

export function adminCookieValue(): string {
  return sign({ role: "admin", exp: Date.now() + ADMIN_MAX_AGE * 1000 });
}

export function voterCookieValue(voterId: string, entryId: string): string {
  return sign({ voterId, entryId, exp: Date.now() + VOTER_MAX_AGE * 1000 });
}

export function digestMaterial(material: string): string {
  return crypto.createHmac("sha256", secret()).update(material).digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const data = verify<AdminToken>(jar.get(ADMIN_COOKIE)?.value);
  return data?.role === "admin";
}

export async function readVoterCookie(): Promise<{ voterId: string; entryId: string } | null> {
  const jar = await cookies();
  const data = verify<VoterToken>(jar.get(VOTER_COOKIE)?.value);
  if (!data?.voterId || !data.entryId) return null;
  return { voterId: data.voterId, entryId: data.entryId };
}

export function requestIsSecure(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  return new URL(request.url).protocol === "https:";
}

export function cookieBase(request: Request, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: requestIsSecure(request),
    path: "/",
    maxAge,
  };
}

export const cookieNames = { admin: ADMIN_COOKIE, voter: VOTER_COOKIE };
export const cookieAges = { admin: ADMIN_MAX_AGE, voter: VOTER_MAX_AGE };
