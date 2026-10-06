/**
 * กติกาของกระดานแซว ฝั่งที่ไม่ต้องคุยกับฐานข้อมูล
 *
 * ฟังก์ชันล้วน ไม่แตะ DOM และไม่แตะฐานข้อมูล จึง import ได้ทั้งจาก
 * Server Component และไฟล์ "use client"
 */

/** ยาวเกินนี้ฐานข้อมูลไม่รับ ดักที่หน้าเว็บด้วยจะได้ไม่ต้องยิงไปเสียเที่ยว */
export const WALL_BODY_MAX = 300;

/**
 * เวลาแบบ "3 ชม." "เมื่อวาน" "2 วัน"
 *
 * เวลาปัจจุบันเป็นค่าเริ่มต้นของพารามิเตอร์ ไม่ได้เรียก Date.now() ในตัว
 * component เพราะกฎ react-hooks/purity ห้ามเรียกฟังก์ชันที่ให้ผลไม่เหมือนเดิม
 * ตอน render พอซ่อนไว้หลังพารามิเตอร์แบบนี้ ที่เรียกก็เขียนสั้นๆ ได้
 * และยังส่งเวลาเข้ามาเองได้ตอนเขียนเทส (วิธีเดียวกับ daysLeftUntil ใน date.ts)
 *
 * เรียกจากฝั่งเซิร์ฟเวอร์เท่านั้น แล้วส่งข้อความสำเร็จรูปลงไปให้ component
 * ถ้าไปคิดฝั่งเบราว์เซอร์ ค่าที่ได้จะไม่ตรงกับที่เซิร์ฟเวอร์วาดไว้ตอน hydrate
 */
export function relativeThai(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";

  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return "เมื่อกี้";
  if (minutes < 60) return `${minutes} นาที`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "เมื่อวาน";
  if (days < 30) return `${days} วัน`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} เดือน`;

  return `${Math.floor(months / 12)} ปี`;
}

/** ตัดข้อความยาวๆ ให้พอดีบับเบิลที่ลอยอยู่รอบรูป */
export function shortenForBubble(text: string, max = 42): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * หน้าตาของบับเบิลแต่ละใบ
 *
 * ตรึงไว้ตามลำดับ ไม่ได้สุ่ม เพราะถ้าสุ่มทุกครั้งที่ render หน้าจะกระพริบ
 * และ server กับ client จะได้คนละค่าจน React เตือนเรื่อง hydration
 *
 * ตำแหน่งวางตาม mockup คือใบแรกลอยเหนือรูป อีกสองใบอยู่ข้างขวาของรูป
 *
 * ระยะจากขอบบนเป็นหน่วยตายตัว ไม่ใช่เปอร์เซ็นต์ของความสูงการ์ด เพราะการ์ด
 * สูงไม่เท่ากันตามความยาวคำโปรย ถ้าใช้เปอร์เซ็นต์ บับเบิลใบล่างจะเลื่อนลงไป
 * ทับป้ายอันดับกับชื่อในบางโปรไฟล์ ส่วนความกว้างยังเป็นเปอร์เซ็นต์ได้
 * เพราะต้องย่อตามจอ
 */
export const BUBBLE_STYLES = [
  {
    position: "left-2 top-2 max-w-[66%] sm:max-w-[52%]",
    tone: "bg-club-gold/25",
    tilt: "-rotate-2",
  },
  {
    position: "right-1 top-20 max-w-[58%] sm:max-w-[46%]",
    tone: "bg-surface",
    tilt: "rotate-1",
  },
  {
    position: "right-3 top-34 max-w-[54%] sm:max-w-[42%]",
    tone: "bg-accent-soft",
    tilt: "-rotate-1",
  },
] as const;
