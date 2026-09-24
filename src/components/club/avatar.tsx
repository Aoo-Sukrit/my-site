/**
 * รูปโปรไฟล์ มีสองทรง
 *   Avatar         วงกลมเล็ก ใช้ในรายการของหน้าแอดมิน
 *   PortraitAvatar สี่เหลี่ยม 3:4 เต็มความกว้างกล่องที่ครอบอยู่
 *
 * ใช้ <img> ธรรมดาแทน next/image เพราะรูปอยู่บนโดเมนของ Supabase ซึ่งมาจาก
 * env ถ้าจะใช้ next/image ต้องไปประกาศ remotePatterns ใน next.config ให้ตรง
 * กับโปรเจกต์ Supabase แต่ละอัน และรูปพวกนี้ถูกครอปกับย่อมาแล้วตั้งแต่ก่อนอัป
 * ไม่เกิน 500KB จึงไม่ได้อะไรเพิ่มจากการ optimize ซ้ำ
 */

function initialOf(nickname: string) {
  return nickname.slice(0, 1).toUpperCase();
}

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
        {initialOf(nickname)}
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

export function PortraitAvatar({
  src,
  nickname,
  className = "",
}: {
  src: string | null;
  nickname: string;
  className?: string;
}) {
  return (
    <div
      className={`aspect-[3/4] w-full overflow-hidden rounded-2xl bg-accent-soft ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`รูปโปรไฟล์ของ ${nickname}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-full w-full items-center justify-center font-display text-5xl font-medium text-accent-strong"
        >
          {initialOf(nickname)}
        </span>
      )}
    </div>
  );
}
