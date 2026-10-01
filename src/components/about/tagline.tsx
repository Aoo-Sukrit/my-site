import { taglineParts } from "@/lib/about-rules";

/**
 * คำแนะนำตัวสั้นๆ จากหน้า ABOUT
 *
 * อยู่ที่เดียวเพราะใช้ทั้งใน /about และหน้าแรก ถ้าก๊อปโค้ดไว้สองที่
 * วันหลังแก้ที่หนึ่งแล้วอีกหน้าจะเพี้ยนไปเงียบๆ
 *
 * ขึ้นบรรทัดใหม่ตามที่พิมพ์ด้วย whitespace-pre-line ไม่รวบเป็นย่อหน้าเดียว
 * เพราะคนเขียนตั้งใจจัดบรรทัดเอง เช่นไล่ชื่อกีฬาเป็นแถวเดียว
 *
 * ตั้งใจไม่ใช้ <p> เพราะ globals.css ตั้ง line-height ของ <p> ไว้ 1.9
 * สำหรับย่อหน้าภาษาไทยยาวๆ พอมาเจอข้อความที่ขึ้นบรรทัดเองอยู่แล้วสี่บรรทัด
 * ระยะนั้นจะห่างจนดูเหมือนหลุดออกจากกัน ตรงนี้คุมเองที่ leading-relaxed
 */
export default function AboutTagline({
  tagline,
  className = "",
}: {
  tagline: string | null;
  className?: string;
}) {
  const { label, body } = taglineParts(tagline);
  if (!label && !body) return null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label ? (
        <p className="text-xs tracking-[0.2em] text-accent-strong uppercase">
          {label}
        </p>
      ) : null}

      {body ? (
        <div className="text-sm leading-relaxed whitespace-pre-line text-muted">
          {body}
        </div>
      ) : null}
    </div>
  );
}
