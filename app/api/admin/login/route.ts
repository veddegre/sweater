import {
  adminConfigured,
  adminCookieValue,
  cookieAges,
  cookieBase,
  cookieNames,
  loginLockMessage,
  noteLoginFailure,
  noteLoginSuccess,
  passwordMatches,
} from "@/lib/auth";
import { json } from "@/lib/http";

export async function POST(request: Request) {
  const locked = loginLockMessage();
  if (locked) return json({ error: locked }, 429);
  if (!adminConfigured()) {
    return json({ error: "Set ADMIN_PASSWORD in the environment, then restart the server." }, 500);
  }
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!passwordMatches(password)) {
    noteLoginFailure();
    return json({ error: "That password doesn't match." }, 401);
  }
  noteLoginSuccess();
  const response = json({ ok: true });
  response.cookies.set(cookieNames.admin, adminCookieValue(), cookieBase(request, cookieAges.admin));
  return response;
}
