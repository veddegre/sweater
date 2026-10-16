import type { Metadata } from "next";
import { ContestBoard } from "@/components/ContestBoard";
import { getPublicContest } from "@/lib/contest";

export async function generateMetadata(): Promise<Metadata> {
  const contest = await getPublicContest();
  return { title: { absolute: contest.title } };
}

export default async function HomePage() {
  const contest = await getPublicContest();
  return <ContestBoard initial={contest} />;
}
