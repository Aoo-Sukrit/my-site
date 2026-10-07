import {
  MUG_BEER,
  MUG_BODY_PATH,
  MUG_BUBBLES,
  MUG_FOAM_PATH,
  MUG_HANDLE_PATH,
  MUG_HANDLE_STROKE,
  MUG_INITIAL_FONT,
  MUG_INNER,
  MUG_PHOTO_BOX,
  MUG_RIBBON_COLOR,
  MUG_RIBBON_FONT,
  MUG_RIBBON_LABEL,
  MUG_RIBBON_PATH,
  MUG_RIBBON_TEXT,
  MUG_STROKE,
  MUG_VIEW,
} from "@/lib/beer-mug";

/**
 * รูปคนอยู่ในแก้วเบียร์ ใช้กับโพเดียมอันดับ 1–3
 *
 * ทรงแก้วมาจาก src/lib/beer-mug.ts ตัวเดียวกับที่รูปสตอรี่ใช้
 * ถ้าจะแก้ทรงให้แก้ที่ไฟล์นั้นที่เดียว
 *
 * เป็น Server Component ธรรมดา ไม่มี state ไม่มี hook จึงใช้ useId ไม่ได้
 * id ของ clipPath กับ gradient เลยรับมาจากข้างนอก (ใช้ id ของสมาชิก)
 * เพราะถ้าหลายแก้วในหน้าเดียวใช้ id ซ้ำกัน เบราว์เซอร์จะไปหยิบตัวแรกมาใช้หมด
 *
 * เรื่องสี เส้นขอบอ่านจาก --accent-strong ผ่าน currentColor (น้ำตาลอิฐ ไม่ใช่ดำ
 * ให้ตรงกับแก้วในรูปสตอรี่) จึงสลับตามโหมดมืดเอง
 * ส่วนฟองเบียร์ สีเบียร์ และสีริบบิ้นตรึงค่าไว้ เพราะเป็นสีของวัตถุไม่ใช่สีของธีม
 * และต้องอ่านออกเหมือนกันทั้งสองโหมด
 */
export default function BeerMug({
  uid,
  src,
  nickname,
  rank,
}: {
  /** ต้องไม่ซ้ำกันในหน้าเดียว ปกติใช้ id ของสมาชิก */
  uid: string;
  src: string | null;
  nickname: string;
  /** null เมื่อใช้นอกโพเดียม เช่นบนหน้าโปรไฟล์ จะไม่มีริบบิ้นอันดับติดมา */
  rank: number | null;
}) {
  const clipId = `mug-body-${uid}`;
  const beerId = `mug-beer-${uid}`;
  const ribbon = rank === null ? undefined : MUG_RIBBON_COLOR[rank];
  const label = rank === null ? undefined : MUG_RIBBON_LABEL[rank];

  return (
    <svg
      viewBox={`0 0 ${MUG_VIEW.width} ${MUG_VIEW.height}`}
      className="block h-auto w-full text-accent-strong"
      role="img"
      aria-label={rank === null ? nickname : `อันดับ ${rank} ${nickname}`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={MUG_BODY_PATH} />
        </clipPath>
        <linearGradient id={beerId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={MUG_BEER.top} />
          <stop offset="55%" stopColor={MUG_BEER.mid} />
          <stop offset="100%" stopColor={MUG_BEER.bottom} />
        </linearGradient>
      </defs>

      {/* หูจับอยู่หลังตัวแก้ว ตัวแก้วจะทับรอยต่อให้เอง */}
      <path
        d={MUG_HANDLE_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={MUG_HANDLE_STROKE}
      />

      {src ? (
        <image
          href={src}
          x={MUG_PHOTO_BOX.x}
          y={MUG_PHOTO_BOX.y}
          width={MUG_PHOTO_BOX.width}
          height={MUG_PHOTO_BOX.height}
          // รูปโปรไฟล์ครอปมาเป็นทรงสูงใกล้เคียงช่องนี้แล้ว slice จึงเต็มแก้ว
          // โดยแทบไม่ต้องตัดอะไรทิ้ง ส่วนรูปเก่าที่เป็น 3:4 จะถูกตัดด้านล่าง
          // จึงเล็งไว้ที่ขอบบน หน้าคนจะได้ไม่โดนตัด
          preserveAspectRatio="xMidYMin slice"
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <>
          {/* ยังไม่ได้ลงรูป ก็เป็นแก้วเบียร์เต็มใบไปเลย ดีกว่าแก้วเปล่าๆ */}
          <path d={MUG_BODY_PATH} fill={`url(#${beerId})`} />
          {MUG_BUBBLES.map((bubble) => (
            <circle
              key={`${bubble.cx}-${bubble.cy}`}
              cx={bubble.cx}
              cy={bubble.cy}
              r={bubble.r}
              fill={MUG_BEER.bubble}
              opacity={0.55}
              clipPath={`url(#${clipId})`}
            />
          ))}
          <text
            x={MUG_INNER.x + MUG_INNER.width / 2}
            y={MUG_INNER.y + MUG_INNER.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={MUG_INITIAL_FONT}
            fontWeight={600}
            fill={MUG_BEER.initial}
            className="font-display"
          >
            {nickname.slice(0, 1).toUpperCase()}
          </text>
        </>
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

      {ribbon && label ? (
        <>
          <path
            d={MUG_RIBBON_PATH}
            fill={ribbon.fill}
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <text
            x={MUG_RIBBON_TEXT.x + MUG_RIBBON_TEXT.width / 2}
            y={MUG_RIBBON_TEXT.y + MUG_RIBBON_TEXT.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={MUG_RIBBON_FONT}
            fontWeight={700}
            letterSpacing={1}
            fill={ribbon.text}
            className="font-display"
          >
            {label}
          </text>
        </>
      ) : null}
    </svg>
  );
}
