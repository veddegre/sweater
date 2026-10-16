import { createEntry } from "@/lib/contest";
import { json } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const result = await createEntry(form, "public");
    if (!result.ok) return json({ error: result.error }, result.status);
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "Something went wrong." }, 500);
  }
}
