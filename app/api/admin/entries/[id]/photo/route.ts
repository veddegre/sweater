import { isAdmin } from "@/lib/auth";
import { getAdminOverview, replaceEntryPhoto } from "@/lib/contest";
import { json } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return json({ error: "Sign in as the competition admin." }, 401);
  try {
    const { id } = await context.params;
    const photo = (await request.formData()).get("photo");
    if (!(photo instanceof File)) return json({ error: "Choose a photo." }, 400);
    const result = await replaceEntryPhoto(id, photo);
    if (!result.ok) return json({ error: result.error }, result.status);
    return json(await getAdminOverview());
  } catch (error) {
    console.error(error);
    return json({ error: "Something went wrong." }, 500);
  }
}
