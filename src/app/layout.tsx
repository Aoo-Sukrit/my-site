import type { Metadata } from "next";
import { Anuphan, IBM_Plex_Sans_Thai_Looped } from "next/font/google";

import PageTransition from "@/components/page-transition";
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

/**
 * ที่อยู่ของเว็บ ใช้ต่อหน้าลิงก์รูปพรีวิวตอนแชร์ให้เป็น URL เต็ม
 *
 * ไม่ได้ฝังโดเมนไว้ในโค้ด เพราะ preview กับ production คนละโดเมน และโดเมนจริง
 * อาจเปลี่ยนได้ Vercel ใส่ค่าพวกนี้มาให้เองตอน deploy
 *   VERCEL_PROJECT_PRODUCTION_URL  โดเมนจริงของโปรเจกต์ (รวมโดเมนที่ตั้งเอง)
 *   VERCEL_URL                     โดเมนของ deploy นั้นๆ ใช้ตอนเปิด preview
 * ตอนรันในเครื่องไม่มีทั้งคู่ จึงถอยไปที่ localhost
 *
 * ถ้าไม่ตั้งค่านี้ Next ก็เดาเองได้ แต่จะเตือนตอน build ทุกครั้ง
 * เขียนไว้ตรงนี้ให้เห็นชัดกว่าว่าลิงก์รูปพรีวิวชี้ไปที่ไหน
 */
const origin =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

export const metadata: Metadata = {
  metadataBase: new URL(
    origin ? `https://${origin}` : "http://localhost:3000",
  ),
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
          <PageTransition>{children}</PageTransition>
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
