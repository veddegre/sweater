import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import { PageIntro } from "@/components/SiteChrome";
import { isAdmin } from "@/lib/auth";
import { getAdminOverview } from "@/lib/contest";

export const metadata: Metadata = { title: "Competition desk" };

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const overview = await getAdminOverview();
  return (
    <>
      <PageIntro
        eyebrow="Competition desk"
        title="Run the competition"
        lede="Post apparel, open voting, and see the tally before it goes public."
      />
      <main className="page">
        <AdminDashboard initial={overview} />
      </main>
    </>
  );
}
