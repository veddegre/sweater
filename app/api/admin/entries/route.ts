import { isAdmin } from "@/lib/auth";
import { createEntry, getAdminOverview } from "@/lib/contest";
import { json } from "@/lib/http";

export async function POST(request: Request) {
  if (!(await isAdmin())) return json({ error: "Sign in as the competition admin." }, 401);
  try {
    const result = await createEntry(await request.formData(), "admin");
    if (!result.ok) return json({ error: result.error }, result.status);
    return json(await getAdminOverview());
  } catch (error) {
    console.error(error);
    return json({ error: "Something went wrong." }, 500);
  }
}
