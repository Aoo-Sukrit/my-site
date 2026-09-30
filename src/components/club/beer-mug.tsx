import {
  MUG_BADGE,
  MUG_BADGE_FONT,
  MUG_BODY_PATH,
  MUG_FOAM_PATH,
  MUG_HANDLE_PATH,
  MUG_HANDLE_STROKE,
  MUG_INITIAL_FONT,
  MUG_INNER,
  MUG_PHOTO_BOX,
  MUG_SHADOW_OFFSET,
  MUG_STROKE,
  MUG_VIEW,
} from "@/lib/beer-mug";

/**
 * รูปคนอยู่ในแก้วเบียร์ ใช้กับโพเดียมอันดับ 1–3
 *
 * ทรงแก้วมาจาก src/lib/beer-mug.ts ซึ่งลอก path มาจาก docs/mockups/beer-mug.svg
 * ตัวเดียวกับที่รูปสตอรี่ใช้ ถ้าจะแก้ทรงให้แก้ที่ไฟล์นั้นที่เดียว
 *
 * เป็น Server Component ธรรมดา ไม่มี state ไม่มี hook จึงใช้ useId ไม่ได้
 * id ของ clipPath เลยรับมาจากข้างนอก (ใช้ id ของสมาชิก) เพราะถ้าหลายแก้ว
 * ในหน้าเดียวใช้ id ซ้ำกัน เบราว์เซอร์จะไปหยิบ clipPath ตัวแรกมาใช้กับทุกแก้ว
 *
 * เรื่องสี ทุกอย่างอ่านจาก token ใน globals.css ผ่าน currentColor และคลาส fill-*
 * จึงสลับตามโหมดมืดเอง ยกเว้นฟองเบียร์กับสีทองของอันดับ 1 ที่ตรึงค่าไว้
 * เพราะต้องอ่านออกทั้งสองโหมดเหมือนกัน
 */
export default function BeerMug({
  uid,
  src,
  nickname,
  rank,
  first = false,
}: {
  /** ต้องไม่ซ้ำกันในหน้าเดียว ปกติใช้ id ของสมาชิก */
  uid: string;
  src: string | null;
  nickname: string;
  rank: number;
  /** อันดับ 1 ใช้เงาสีทอง ที่เหลือใช้เงาสีกลางๆ ที่เห็นได้ทั้งสองโหมด */
  first?: boolean;
}) {
  const clipId = `mug-body-${uid}`;
  const shadowClass = first ? "text-club-gold" : "text-muted";
  const badgeFill = first ? "fill-club-gold" : "fill-foreground";
  const badgeText = first ? "fill-club-cream" : "fill-background";

  return (
    <svg
      viewBox={`0 0 ${MUG_VIEW.width} ${MUG_VIEW.height}`}
      className="block h-auto w-full text-foreground"
      role="img"
      aria-label={`อันดับ ${rank} ${nickname}`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={MUG_BODY_PATH} />
        </clipPath>
      </defs>

      {/* เงา เลื่อนไปขวาล่าง วาดก่อนทุกอย่างจะได้อยู่หลังสุด */}
      <g
        transform={`translate(${MUG_SHADOW_OFFSET},${MUG_SHADOW_OFFSET})`}
        className={shadowClass}
        fill="currentColor"
        stroke="currentColor"
      >
        <path
          d={MUG_HANDLE_PATH}
          fill="none"
          strokeWidth={MUG_HANDLE_STROKE}
        />
        <path d={MUG_FOAM_PATH} />
        <path d={MUG_BODY_PATH} />
      </g>

      {/* หูจับอยู่หลังตัวแก้ว ตัวแก้วจะทับรอยต่อให้เอง */}
      <path
        d={MUG_HANDLE_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={MUG_HANDLE_STROKE}
      />

      {/* พื้นในแก้ว โผล่ให้เห็นเฉพาะตอนไม่มีรูป */}
      <path d={MUG_BODY_PATH} className="fill-accent-soft" />

      {src ? (
        <image
          href={src}
          x={MUG_PHOTO_BOX.x}
          y={MUG_PHOTO_BOX.y}
          width={MUG_PHOTO_BOX.width}
          height={MUG_PHOTO_BOX.height}
          // รูปโปรไฟล์ครอปมาเป็น 3:4 แล้ว slice จะเต็มแก้วพอดีไม่มีขอบว่าง
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <text
          x={MUG_INNER.x + MUG_INNER.width / 2}
          y={MUG_INNER.y + MUG_INNER.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={MUG_INITIAL_FONT}
          fontWeight={600}
          className="fill-accent-strong font-display"
        >
          {nickname.slice(0, 1).toUpperCase()}
        </text>
      )}

      <path
        d={MUG_BODY_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={MUG_STROKE}
        strokeLinejoin="round"
      />
      <path
        d={MUG_FOAM_PATH}
        className="fill-club-cream"
        stroke="currentColor"
        strokeWidth={MUG_STROKE}
        strokeLinejoin="round"
      />

      {/* เลขอันดับติดมุมซ้ายบน คร่อมขอบฟอง */}
      <circle
        cx={MUG_BADGE.cx}
        cy={MUG_BADGE.cy}
        r={MUG_BADGE.r}
        className={badgeFill}
      />
      <text
        x={MUG_BADGE.cx}
        y={MUG_BADGE.cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={MUG_BADGE_FONT}
        fontWeight={700}
        className={`${badgeText} font-display`}
      >
        {rank}
      </text>
    </svg>
  );
}
