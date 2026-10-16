import { isAdmin } from "@/lib/auth";
import { archivedResultsCsv, currentResultsCsv } from "@/lib/contest";

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return new Response("Sign in as the competition admin.", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const yearParam = new URL(request.url).searchParams.get("year");
  const file = yearParam === null ? currentResultsCsv() : archivedResultsCsv(Number(yearParam));
  if (!file) {
    return new Response("No saved results for that year.", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(file.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
