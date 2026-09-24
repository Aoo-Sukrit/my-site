/**
 * รูปโปรไฟล์ ไม่มีรูปก็โชว์ตัวอักษรแรกของฉายาแทน
 *
 * ใช้ <img> ธรรมดาแทน next/image เพราะรูปอยู่บนโดเมนของ Supabase ซึ่งมาจาก
 * env ถ้าจะใช้ next/image ต้องไปประกาศ remotePatterns ใน next.config ให้ตรง
 * กับโปรเจกต์ Supabase แต่ละอัน และรูปพวกนี้ถูกย่อมาแล้วตั้งแต่ก่อนอัป
 * ไม่เกิน 500KB จึงไม่ได้อะไรเพิ่มจากการ optimize ซ้ำ
 */
export default function Avatar({
  src,
  nickname,
  size = 56,
}: {
  src: string | null;
  nickname: string;
  size?: number;
}) {
  const style = { width: size, height: size };

  if (!src) {
    return (
      <span
        style={style}
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-lg font-medium text-accent-strong"
      >
        {nickname.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`รูปโปรไฟล์ของ ${nickname}`}
      style={style}
      className="shrink-0 rounded-full object-cover"
    />
  );
}
