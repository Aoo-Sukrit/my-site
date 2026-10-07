import { useId } from "react";

import {
  MUG_BEER,
  MUG_BODY_PATH,
  MUG_BUBBLES,
  MUG_FOAM_PATH,
  MUG_HANDLE_PATH,
  MUG_HANDLE_STROKE,
  MUG_RIM,
  MUG_RIM_SPAN,
  MUG_STROKE,
  MUG_VIEW,
} from "@/lib/beer-mug";

/**
 * แก้วเบียร์สองใบชนกัน ใช้ตอนรอของที่ต้องใช้เวลา เช่นรอวาดรูปสตอรี่
 *
 * ทรงแก้วมาจาก src/lib/beer-mug.ts ชุดเดียวกับโพเดียม หน้าตาจะได้เข้ากัน
 * ใบซ้ายกลับด้านให้หูจับอยู่ด้านนอก ทั้งสองใบเอียงเข้าหากันแล้วชนตรงฟอง
 * พอชนแล้วมีฟองกระเด็นขึ้นมานิดหน่อย ท่าทางทั้งหมดอยู่ใน globals.css
 * (หาคำว่า cheers)
 *
 * คนที่ตั้งเครื่องไว้ว่าไม่อยากเห็นของขยับ จะเห็นแก้วสองใบตั้งนิ่งๆ
 *
 * ขอบแก้วเป็นทองไล่เฉด MUG_RIM ชุดเดียวกับโพเดียม ฟองที่กระเด็นใช้ขอบสีฟอง
 * (MUG_RIM.foam) ให้ดูเป็นฟองที่หลุดออกมาจากแก้วจริง
 */

/** ระยะห่างจากขอบซ้ายของรูปถึงแก้วแต่ละใบ เว้นช่องกลางไว้ให้เอียงเข้ามาชนได้ */
const LEFT_X = 18;
const RIGHT_X = 160;
const WIDTH = RIGHT_X + MUG_VIEW.width + 4;

/** จุดที่ฟองสองใบแตะกัน ใช้เป็นต้นทางของฟองที่กระเด็น */
const CLINK = { x: (LEFT_X + MUG_VIEW.width + RIGHT_X) / 2, y: 14 };

const SPLASH = [
  { dx: -20, dy: -20, r: 4 },
  { dx: -7, dy: -30, r: 3 },
  { dx: 7, dy: -28, r: 3.5 },
  { dx: 21, dy: -18, r: 2.8 },
];

function Mug({ uid }: { uid: string }) {
  const clipId = `${uid}-clip`;
  const beerId = `${uid}-beer`;
  const rimId = `${uid}-rim`;

  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <path d={MUG_BODY_PATH} />
        </clipPath>
        <linearGradient id={beerId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={MUG_BEER.top} />
          <stop offset="55%" stopColor={MUG_BEER.mid} />
          <stop offset="100%" stopColor={MUG_BEER.bottom} />
        </linearGradient>
        <linearGradient
          id={rimId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={MUG_RIM_SPAN.y1}
          x2="0"
          y2={MUG_RIM_SPAN.y2}
        >
          <stop offset="0%" stopColor={MUG_RIM.top} />
          <stop offset="55%" stopColor={MUG_RIM.mid} />
          <stop offset="100%" stopColor={MUG_RIM.bottom} />
        </linearGradient>
      </defs>
      <path
        d={MUG_HANDLE_PATH}
        fill="none"
        stroke={`url(#${rimId})`}
        strokeWidth={MUG_HANDLE_STROKE}
      />
      <path d={MUG_BODY_PATH} fill={`url(#${beerId})`} />
      {MUG_BUBBLES.map((bubble, i) => (
        <circle
          key={`${bubble.cx}-${bubble.cy}`}
          cx={bubble.cx}
          cy={bubble.cy}
          r={bubble.r}
          fill={MUG_BEER.bubble}
          opacity={0.6}
          clipPath={`url(#${clipId})`}
          className="cheers-bubble"
          style={{ animationDelay: `${(i % 4) * -0.45}s` }}
        />
      ))}
      <path
        d={MUG_BODY_PATH}
        fill="none"
        stroke={`url(#${rimId})`}
        strokeWidth={MUG_STROKE}
        strokeLinejoin="round"
      />
      <path
        d={MUG_FOAM_PATH}
        className="fill-club-cream"
        stroke={MUG_RIM.foam}
        strokeWidth={MUG_STROKE}
        strokeLinejoin="round"
      />
    </>
  );
}

export default function CheersLoader({
  className = "",
}: {
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox={`0 -20 ${WIDTH} ${MUG_VIEW.height}`}
      className={`block h-auto ${className}`}
      aria-hidden
    >
      {/* ใบซ้าย: กลับด้านซ้ายขวาด้วย matrix ข้างใน แล้วให้ g ข้างนอกเป็นตัวขยับ
          แยกสองชั้นเพราะ transform ของ CSS จะทับ transform ของ SVG ถ้าอยู่ชั้นเดียวกัน */}
      <g className="cheers-left">
        <g
          transform={`translate(${LEFT_X} 0) matrix(-1 0 0 1 ${MUG_VIEW.width} 0)`}
        >
          <Mug uid={`${uid}-l`} />
        </g>
      </g>

      <g className="cheers-right">
        <g transform={`translate(${RIGHT_X} 0)`}>
          <Mug uid={`${uid}-r`} />
        </g>
      </g>

      {/* ฟองที่กระเด็นตอนแก้วชนกัน */}
      <g>
        {SPLASH.map((drop) => (
          <circle
            key={`${drop.dx}-${drop.dy}`}
            cx={CLINK.x}
            cy={CLINK.y}
            r={drop.r}
            stroke={MUG_RIM.foam}
            strokeWidth={1.5}
            className="cheers-splash fill-club-cream"
            style={
              {
                "--dx": `${drop.dx}px`,
                "--dy": `${drop.dy}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </g>
    </svg>
  );
}
