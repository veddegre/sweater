import { isAdmin } from "@/lib/auth";
import { getAdminOverview } from "@/lib/contest";
import { json } from "@/lib/http";

export async function GET() {
  if (!(await isAdmin())) return json({ error: "Sign in as the competition admin." }, 401);
  try {
    return json(await getAdminOverview());
  } catch (error) {
    console.error(error);
    return json({ error: "Something went wrong." }, 500);
  }
}
