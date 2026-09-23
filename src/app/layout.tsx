import type { Metadata } from "next";
import { Anuphan, IBM_Plex_Sans_Thai_Looped } from "next/font/google";

import SiteHeader from "@/components/site-header";
import { site } from "@/lib/site";
import "./globals.css";

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["latin", "thai"],
});

const plexThaiLooped = IBM_Plex_Sans_Thai_Looped({
  variable: "--font-plex-thai-looped",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${anuphan.variable} ${plexThaiLooped.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:py-14">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto w-full max-w-2xl px-5 py-8 text-sm text-muted">
            ทำไว้แชร์กับเพื่อนๆ เท่านั้น · {site.name}
          </div>
        </footer>
      </body>
    </html>
  );
}
