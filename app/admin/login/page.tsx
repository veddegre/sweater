import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { PageIntro } from "@/components/SiteChrome";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin sign-in" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <>
      <PageIntro
        eyebrow="Competition desk"
        title="Admin sign-in"
        lede="Add apparel, approve entries, and open the voting window."
      />
      <main className="page narrow">
        <LoginForm />
      </main>
    </>
  );
}
