import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { connection } from "next/server";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { countPending } from "@/lib/contest";
import { themeCopy } from "@/lib/themes";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Information Technology",
    template: "%s · Information Technology",
  },
  description: "Grand Valley State University Information Technology competitions. One vote for your favorite.",
};

export const viewport: Viewport = {
  themeColor: "#0032A0",
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const admin = await isAdmin();
  const pending = admin ? await countPending() : 0;

  const theme = themeCopy(getSettings().theme).id;

  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body data-theme={theme}>
        <a className="skip" href="#content">
          Skip to content
        </a>
        <SiteHeader admin={admin} pending={pending} />
        <div id="content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
