import { json } from "@/lib/http";
import { getPublicContest } from "@/lib/contest";

export async function GET() {
  try {
    return json(await getPublicContest());
  } catch (error) {
    console.error(error);
    return json({ error: "Something went wrong." }, 500);
  }
}
