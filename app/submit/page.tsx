import type { Metadata } from "next";
import { PageIntro } from "@/components/SiteChrome";
import { SubmitForm } from "@/components/SubmitForm";
import { getPublicContest } from "@/lib/contest";
import { themeCopy } from "@/lib/themes";

export async function generateMetadata(): Promise<Metadata> {
  const contest = await getPublicContest();
  return { title: themeCopy(contest.theme).enter };
}

export default async function SubmitPage() {
  const contest = await getPublicContest();
  const copy = themeCopy(contest.theme);
  return (
    <>
      <PageIntro eyebrow={`${contest.year} competition`} title={copy.enter} lede={copy.submitLede} />
      <main className="page narrow">
        {contest.submissionsOpen ? (
          <SubmitForm domain={contest.allowedDomain} photoLabel={copy.photo} />
        ) : (
          <p className="alert">Submissions are closed. An admin can still add entries from the desk.</p>
        )}
      </main>
    </>
  );
}
