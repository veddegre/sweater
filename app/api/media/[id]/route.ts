import { readFile } from "node:fs/promises";
import { contentTypeFor, resolveUpload } from "@/lib/uploads";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const file = resolveUpload(id);
  if (!file) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(file);
    return new Response(bytes, {
      headers: {
        "Content-Type": contentTypeFor(id),
        "Content-Length": String(bytes.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
