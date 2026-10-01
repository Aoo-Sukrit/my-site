import { ImageResponse } from "next/og";

import { loadFonts, loadLogoDataUri } from "@/app/club/share/assets";
import { site } from "@/lib/site";

/**
 * รูปพรีวิวตอนแชร์ลิงก์ของเว็บนี้ลง LINE / Facebook
 *
 * ไฟล์นี้เป็นค่าตั้งต้นของทั้งเว็บ หน้าไหนไม่ได้ประกาศรูปของตัวเองก็ได้รูปนี้ไป
 * ซึ่งก็คือ / /about /blog /club และหน้าอื่นๆ ทั้งหมด
 * ส่วนหน้าโพสต์ประกาศ openGraph.images ของตัวเองทับไว้แล้ว จึงยังใช้รูปแรก
 * ของโพสต์เหมือนเดิม
 *
 * ตั้งใจให้มีแค่โลโก้กับชื่อเว็บ ไม่มีชื่อ รูป หรือระยะของสมาชิกคนไหนเลย
 * เพราะรูปพรีวิวถูกดึงไปเก็บไว้ที่เซิร์ฟเวอร์ของ LINE และ Facebook
 * ใครส่งลิงก์ต่อก็เห็นรูปนี้ ไม่มีทางคุมว่าใครเห็นบ้าง
 *
 * วาดด้วย ImageResponse ตัวเดียวกับรูปสตอรี่ เพื่อให้ได้ฟอนต์จริงของเว็บ
 * ไม่ได้ทำเป็นไฟล์ PNG นิ่งๆ เพราะจะต้องไปหาฟอนต์จากเครื่องที่สร้างรูป
 * ซึ่งไม่ใช่ฟอนต์ชุดเดียวกับที่เว็บใช้
 *
 * ไม่ได้อ่านอะไรจากฐานข้อมูลและไม่ได้ใช้ข้อมูลของ request เลย Next จึงสร้าง
 * รูปนี้ตอน build ครั้งเดียวแล้วเก็บไว้ ไม่ได้วาดใหม่ทุกครั้งที่มีคนแชร์
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${site.name} — ${site.tagline}`;

// สีพวกนี้คือ token ชุดที่ตรึงค่าไว้ใน globals.css (--club-cream, --club-ink,
// --club-line) ลอกค่ามาตรงๆ เพราะ satori อ่าน CSS variable ของเว็บไม่ได้
// cream ต้องตรงกับพื้นหลังที่ฝังมาในไฟล์โลโก้ ขอบสี่เหลี่ยมของรูปถึงจะหายไป
const CREAM = "#faf6ea";
const INK = "#3b332c";
const LINE = "#9c4a25";

export default async function OpengraphImage() {
  const [fonts, logo] = await Promise.all([loadFonts(), loadLogoDataUri()]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: "0 80px",
          background: CREAM,
          color: INK,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" width={370} height={370} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontFamily: "PlexThai",
              fontWeight: 600,
              fontSize: 58,
              lineHeight: 1.15,
              letterSpacing: -1,
            }}
          >
            {site.name}
          </div>

          <div
            style={{
              marginTop: 20,
              fontFamily: "Anuphan",
              fontWeight: 400,
              fontSize: 30,
              lineHeight: 1.5,
              color: LINE,
            }}
          >
            {site.tagline}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
