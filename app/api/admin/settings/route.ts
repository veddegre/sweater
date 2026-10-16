import { isAdmin } from "@/lib/auth";
import { getAdminOverview, updateSettings } from "@/lib/contest";
import { json } from "@/lib/http";
import type { ContestSettings } from "@/lib/types";

export async function POST(request: Request) {
  if (!(await isAdmin())) return json({ error: "Sign in as the competition admin." }, 401);
  try {
    const body = (await request.json().catch(() => null)) as ContestSettings | null;
    if (!body) return json({ error: "Missing competition settings." }, 400);
    const result = updateSettings(body);
    if (!result.ok) return json({ error: result.error }, result.status);
    return json(await getAdminOverview());
  } catch (error) {
    console.error(error);
    return json({ error: "Something went wrong." }, 500);
  }
}
