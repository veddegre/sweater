import { isAdmin } from "@/lib/auth";
import { getAdminOverview, resetContest } from "@/lib/contest";
import { json } from "@/lib/http";

export async function POST(request: Request) {
  if (!(await isAdmin())) return json({ error: "Sign in as the competition admin." }, 401);
  try {
    const body = (await request.json().catch(() => null)) as { scope?: unknown } | null;
    if (body?.scope !== "votes" && body?.scope !== "all") {
      return json({ error: "Choose what to reset." }, 400);
    }
    const result = await resetContest(body.scope);
    if (!result.ok) return json({ error: result.error }, result.status);
    return json(await getAdminOverview());
  } catch (error) {
    console.error(error);
    return json({ error: "Something went wrong." }, 500);
  }
}
