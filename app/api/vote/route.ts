import { cookieAges, cookieBase, cookieNames, readVoterCookie, voterCookieValue } from "@/lib/auth";
import { buildPublicContest, castVote } from "@/lib/contest";
import { json } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      entryId?: unknown;
      clientId?: unknown;
      signals?: unknown;
    } | null;
    const cookie = await readVoterCookie();
    const result = castVote(body?.entryId, body?.clientId, body?.signals, cookie?.voterId ?? null);
    if (!result.ok) return json({ error: result.error }, result.status);
    const response = json({
      already: result.already,
      entryName: result.entryName,
      contest: buildPublicContest({ entryId: result.entryId }),
    });
    response.cookies.set(
      cookieNames.voter,
      voterCookieValue(result.voterId, result.entryId),
      cookieBase(request, cookieAges.voter),
    );
    return response;
  } catch (error) {
    console.error(error);
    return json({ error: "Something went wrong." }, 500);
  }
}
