/**
 * ค่าคงที่ของกล่องเสนอแก้กติกา ฝั่งที่ไม่ต้องคุยกับฐานข้อมูล
 *
 * แยกจาก rule-suggestions.ts เพราะไฟล์นั้นใช้ Supabase ฝั่งเซิร์ฟเวอร์
 * (next/headers) ช่องพิมพ์ซึ่งเป็น "use client" import ไฟล์นั้นไม่ได้
 * แบบเดียวกับ wall-rules.ts ของกระดานแซว
 */

/** ความยาวสูงสุดต่อข้อ ต้องตรงกับ rule_suggestion_add() ในฐานข้อมูล */
export const RULE_SUGGESTION_MAX = 280;
