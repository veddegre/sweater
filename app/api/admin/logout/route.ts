import { isAdmin, cookieAges, cookieBase, cookieNames } from "@/lib/auth";
import { json } from "@/lib/http";

export async function POST(request: Request) {
  if (!(await isAdmin())) return json({ error: "Sign in as the competition admin." }, 401);
  const response = json({ ok: true });
  response.cookies.set(cookieNames.admin, "", { ...cookieBase(request, 0), maxAge: 0 });
  return response;
}
