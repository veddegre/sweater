import { isAdmin } from "@/lib/auth";
import { deleteEntry, getAdminOverview, updateEntry } from "@/lib/contest";
import { json } from "@/lib/http";

async function guard() {
  if (!(await isAdmin())) return json({ error: "Sign in as the competition admin." }, 401);
  return null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      name?: unknown;
      status?: unknown;
    };
    const result = updateEntry(id, body);
    if (!result.ok) return json({ error: result.error }, result.status);
    return json(await getAdminOverview());
  } catch (error) {
    console.error(error);
    return json({ error: "Something went wrong." }, 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const result = await deleteEntry(id);
    if (!result.ok) return json({ error: result.error }, result.status);
    return json(await getAdminOverview());
  } catch (error) {
    console.error(error);
    return json({ error: "Something went wrong." }, 500);
  }
}
