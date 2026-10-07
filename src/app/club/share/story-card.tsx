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
  MUG_PRINT,
  MUG_RIM,
  MUG_RIM_SPAN,
  MUG_RIBBON_COLOR,
  MUG_RIBBON_FONT,
  MUG_RIBBON_LABEL,
  MUG_RIBBON_PATH,
  MUG_RIBBON_TEXT,
  MUG_STROKE,
  MUG_VIEW,
} from "@/lib/beer-mug";
import { formatKm, formatPercent } from "@/lib/date";

/**
 * หน้าตาของรูปสตอรี่ 1080 x 1920
 *
 * satori รองรับแค่ flexbox ไม่มี grid และทุก element ที่มีลูกหลายตัวต้องระบุ
 * display: flex เองเสมอ ไม่มีค่า default แบบเบราว์เซอร์
 *
 * สีตรึงค่าไว้หมด ไม่อ่านโหมดมืดของเครื่อง รูปที่ออกมาจะได้เหมือนกันทุกครั้ง
 * ไม่ว่าใครกดจากเครื่องไหน
 */

const CREAM = "#faf6ea";
const INK = "#3b332c";
const MUTED = "#7c7066";
const ACCENT = "#9c4a25";
const LINE = "#e6dcc8";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

/**
 * ความหนาแน่นของหน้า
 *
 * รูปสตอรี่สูงตายตัว 1920 แต่จำนวนคนในคลับไม่ตายตัว เมื่อก่อนแก้ด้วยการตัด
 * คนท้ายๆ ทิ้งแล้วเขียนว่า "และอีก N คน" ซึ่งแปลว่าคนที่วิ่งจริงบางคนไม่ได้
 * โผล่ในรูปที่เอาไปลงสตอรี่เลย รอบนี้เลยกลับด้าน: แสดงทุกคนที่มีผลเสมอ
 * แล้วย่อขนาดลงเป็นขั้นๆ ตามจำนวนแถวแทน
 *
 * ย่อสองอย่างพร้อมกัน
 *   - แถวในรายการ ความสูง รูป และตัวหนังสือ
 *   - ส่วนหัว โลโก้กับโพเดียม เพื่อคืนที่ว่างให้รายการ
 * ถ้าย่อจนแถวเตี้ยกว่าที่อ่านสบายแล้วยังไม่พอ ค่อยแบ่งเป็นสองคอลัมน์
 *
 * ตัวเลขทั้งหมดได้มาจากการเรนเดอร์จริงแล้วดูด้วยตาที่ 5, 12, 20 และ 30 คน
 */

const CONTENT_WIDTH = STORY_WIDTH - 56 * 2;

type ListTier = {
  columns: 1 | 2;
  rowHeight: number;
  photoWidth: number;
  photoHeight: number;
  photoRadius: number;
  rankWidth: number;
  rankSize: number;
  nameSize: number;
  valueSize: number;
  subSize: number;
  smallSize: number;
  /** บรรทัดรอง (แคปชั่น หรือจำนวนครั้ง) แน่นมากแล้วตัดทิ้งเพื่อเอาที่ให้ชื่อ */
  showSecondary: boolean;
};

const COLUMN_GAP = 28;

/** ช่องไฟระหว่างช่องโพเดียม ใช้ทั้งแถวแก้วและแถวตัวหนังสือ จะได้ตรงแนวกัน */
const PODIUM_GAP = 20;

/** เส้นเคาน์เตอร์ที่แก้ววางอยู่ สีเดียวกับที่ลอกมาจาก mockup */
const COUNTER = "#8a6a45";

/** ด้านของรูปวงแสงหลังแก้วที่ 1 */
const SPOTLIGHT_SIZE = 620;

/**
 * วงแสงจางๆ หลังแก้วที่ 1
 *
 * satori ทำ radial-gradient ใน CSS ไม่ได้ จึงวาดเป็น SVG แล้วยัดเป็น data URI
 * ให้ <img> ใบหนึ่ง วิธีเดียวกับตัวแก้ว คำนวณครั้งเดียวตอนโหลดโมดูล
 * ไม่ต้องสร้างใหม่ทุกครั้งที่มีคนขอรูป
 */
const SPOTLIGHT_URI = `data:image/svg+xml;base64,${Buffer.from(
  [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">`,
    `<defs><radialGradient id="g" cx="50%" cy="50%" r="50%">`,
    `<stop offset="0%" stop-color="#d8890c" stop-opacity="0.85"/>`,
    `<stop offset="55%" stop-color="#d8890c" stop-opacity="0.28"/>`,
    `<stop offset="100%" stop-color="#d8890c" stop-opacity="0"/>`,
    `</radialGradient></defs>`,
    `<rect width="100" height="100" fill="url(#g)"/>`,
    `</svg>`,
  ].join(""),
  "utf8",
).toString("base64")}`;

type Density = {
  logo: number;
  mugFirst: number;
  podiumNameFirst: number;
  podiumNameSide: number;
  podiumValueFirst: number;
  podiumValueSide: number;
  showPodiumCaption: boolean;
  list: ListTier;
};

/** แถวต่อคอลัมน์ ใช้เลือกความสูงแถว ไม่ใช่จำนวนคนทั้งหมด */
function rowsPerColumn(rowCount: number, columns: 1 | 2) {
  return columns === 1 ? rowCount : Math.ceil(rowCount / 2);
}

function pickListTier(rowCount: number): ListTier {
  // คอลัมน์เดียวอ่านง่ายกว่าเสมอ ใช้ไปจนกว่าแถวจะเตี้ยเกินรับได้
  const columns: 1 | 2 = rowCount <= 7 ? 1 : 2;
  const perColumn = rowsPerColumn(rowCount, columns);

  // สองคอลัมน์แถวแคบลงครึ่งหนึ่ง ตัวเลขทางขวากับรูปกินที่เท่าเดิม เหลือให้ชื่อ
  // น้อยมากจนโดนตัดเหลือเจ็ดแปดตัว ขยับลงอีกขั้นให้ฟอนต์เล็กลง ชื่อจะได้ยาวขึ้น
  const step = columns === 1 ? perColumn : perColumn + 3;

  if (step <= 7) {
    return {
      columns,
      rowHeight: 92,
      photoWidth: 54,
      photoHeight: 72,
      photoRadius: 12,
      rankWidth: 44,
      rankSize: 28,
      nameSize: 30,
      valueSize: 30,
      subSize: 22,
      smallSize: 20,
      showSecondary: true,
    };
  }

  if (step <= 10) {
    return {
      columns,
      rowHeight: 74,
      photoWidth: 44,
      photoHeight: 59,
      photoRadius: 10,
      rankWidth: 40,
      rankSize: 24,
      nameSize: 26,
      valueSize: 26,
      subSize: 19,
      smallSize: 17,
      showSecondary: true,
    };
  }

  if (step <= 13) {
    return {
      columns,
      rowHeight: 58,
      photoWidth: 36,
      photoHeight: 48,
      photoRadius: 8,
      rankWidth: 36,
      rankSize: 21,
      nameSize: 23,
      valueSize: 23,
      subSize: 0,
      smallSize: 16,
      showSecondary: false,
    };
  }

  return {
    columns,
    rowHeight: 48,
    photoWidth: 30,
    photoHeight: 40,
    photoRadius: 7,
    rankWidth: 32,
    rankSize: 19,
    nameSize: 20,
    valueSize: 20,
    subSize: 0,
    smallSize: 14,
    showSecondary: false,
  };
}

/**
 * คนเยอะก็ต้องคืนที่ว่างจากส่วนหัวให้รายการด้วย
 * ย่อแค่โลโก้กับโพเดียม ไม่แตะหัวข้อกับแถบสรุป เพราะสองอันนั้นคือหน้าตาของคลับ
 */
function pickDensity(rowCount: number): Density {
  const list = pickListTier(rowCount);

  if (rowCount <= 8) {
    return {
      logo: 168,
      mugFirst: 300,
      podiumNameFirst: 34,
      podiumNameSide: 28,
      podiumValueFirst: 38,
      podiumValueSide: 32,
      showPodiumCaption: true,
      list,
    };
  }

  if (rowCount <= 16) {
    return {
      logo: 132,
      mugFirst: 262,
      podiumNameFirst: 30,
      podiumNameSide: 25,
      podiumValueFirst: 34,
      podiumValueSide: 29,
      showPodiumCaption: true,
      list,
    };
  }

  return {
    logo: 104,
    mugFirst: 222,
    podiumNameFirst: 26,
    podiumNameSide: 22,
    podiumValueFirst: 30,
    podiumValueSide: 26,
    showPodiumCaption: false,
    list,
  };
}

/**
 * ความสูงของกล่องรูปในโพเดียม เท่ากันทั้งสามช่องโดยตั้งใจ
 *
 * ถ้าปล่อยให้แต่ละช่องสูงตามเนื้อหา คนที่ไม่มีแคปชั่นจะมีคอลัมน์เตี้ยกว่า
 * พอจัดชิดล่างรูปของคนนั้นจะถูกดันต่ำลงมา แถวโพเดียมเลยดูเบี้ยว
 * ตรึงความสูงกล่องรูปไว้เท่ากัน แล้ววางรูปชิดล่างในกล่อง
 * ชื่อกับระยะของทั้งสามช่องจึงเริ่มที่ระดับเดียวกันเสมอ
 */
/** แก้วสูงเท่าไหร่เมื่อกว้างเท่านี้ อัตราส่วนล็อกตามกรอบวาดใน beer-mug.ts */
function mugHeight(width: number) {
  return Math.round((width * MUG_VIEW.height) / MUG_VIEW.width);
}

/**
 * ชนิดรูปที่ resvg (ตัวแปลง SVG เป็น PNG ที่อยู่หลัง next/og) อ่านออก
 *
 * บัคเก็ต avatars ยอม webp ด้วย แต่ resvg อ่าน webp ไม่ได้ ถ้าใส่เข้าไปมันจะ
 * วาดเป็นช่องว่างเงียบๆ ดักไว้ตรงนี้แล้วให้ตกไปใช้ตัวอักษรแรกแทน จะได้ไม่เห็น
 * แก้วเปล่าโดยไม่รู้สาเหตุ
 */
function usableAvatar(avatar: string | null): string | null {
  if (!avatar) return null;
  return /^data:image\/(jpeg|jpg|png|gif);/i.test(avatar) ? avatar : null;
}

/**
 * แก้วเบียร์ทั้งใบเป็นสตริง SVG
 *
 * ทำไมต้องประกอบเป็นสตริงแล้วส่งเป็นรูปใบเดียว แทนที่จะเขียน <svg> ใน JSX
 * ตรงๆ เหมือนฝั่งเว็บ
 *
 * เพราะ satori พังทั้งรูปเมื่อมี <image> อยู่ใน <svg> ที่เขียนเป็น JSX
 * ขึ้น TypeError: Cannot read properties of undefined (reading '0') ตอนวาด
 * ซึ่งเกิดหลังจาก ImageResponse คืน Response ไปแล้ว บน Vercel จึงเห็นแค่
 * FUNCTION_INVOCATION_FAILED เปล่าๆ ไม่มีข้อความ error ให้ไล่
 * (นี่คือสาเหตุที่รูปสตอรี่พังหลัง e66fd43 ส่วน <text> ใน <svg> ก็พังแบบเดียวกัน)
 *
 * พอประกอบเป็นสตริงแล้วยัดเป็น data URI ให้ <img> ใบเดียว satori เห็นเป็นรูป
 * ธรรมดาใบหนึ่ง ไม่ต้องเดินเข้าไปในต้นไม้ SVG เลย แล้ว resvg เป็นคนวาด
 * clipPath กับ preserveAspectRatio ให้ ซึ่งมันทำได้ครบและหน้าตาเหมือนกันเป๊ะ
 */
function mugSvg(avatar: string | null, rankNo: number): string {
  const box = MUG_PHOTO_BOX;
  const ribbon = MUG_RIBBON_COLOR[rankNo];

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
    ` viewBox="0 0 ${MUG_VIEW.width} ${MUG_VIEW.height}" width="${MUG_VIEW.width}" height="${MUG_VIEW.height}">`,
    `<defs><clipPath id="body"><path d="${MUG_BODY_PATH}"/></clipPath>`,
    `<linearGradient id="beer" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0%" stop-color="${MUG_BEER.top}"/>`,
    `<stop offset="55%" stop-color="${MUG_BEER.mid}"/>`,
    `<stop offset="100%" stop-color="${MUG_BEER.bottom}"/>`,
    `</linearGradient>`,
    // ขอบทองไล่เฉด resvg วาด gradient บน stroke ได้ จึงใช้ชุดเดียวกับเว็บตรงๆ
    `<linearGradient id="rim" gradientUnits="userSpaceOnUse" x1="0" y1="${MUG_RIM_SPAN.y1}" x2="0" y2="${MUG_RIM_SPAN.y2}">`,
    `<stop offset="0%" stop-color="${MUG_RIM.top}"/>`,
    `<stop offset="55%" stop-color="${MUG_RIM.mid}"/>`,
    `<stop offset="100%" stop-color="${MUG_RIM.bottom}"/>`,
    `</linearGradient></defs>`,
    `<path d="${MUG_HANDLE_PATH}" fill="none" stroke="url(#rim)" stroke-width="${MUG_HANDLE_STROKE}"/>`,
    avatar
      ? `<image xlink:href="${avatar}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" preserveAspectRatio="xMidYMin slice" clip-path="url(#body)"/>`
      : [
          `<path d="${MUG_BODY_PATH}" fill="url(#beer)"/>`,
          ...MUG_BUBBLES.map(
            (bubble) =>
              `<circle cx="${bubble.cx}" cy="${bubble.cy}" r="${bubble.r}" fill="${MUG_BEER.bubble}" opacity="0.55" clip-path="url(#body)"/>`,
          ),
        ].join(""),
    `<path d="${MUG_BODY_PATH}" fill="none" stroke="url(#rim)" stroke-width="${MUG_STROKE}" stroke-linejoin="round"/>`,
    `<path d="${MUG_FOAM_PATH}" fill="${MUG_PRINT.foam}" stroke="${MUG_RIM.foam}" stroke-width="${MUG_STROKE}" stroke-linejoin="round"/>`,
    ribbon
      ? `<path d="${MUG_RIBBON_PATH}" fill="${ribbon.fill}" stroke="${MUG_RIM.ribbonStroke}" stroke-width="2.5" stroke-linejoin="round"/>`
      : ``,
    `</svg>`,
  ].join("");
}

/**
 * แก้วหนึ่งใบในโพเดียม
 *
 * ตัวแก้วเป็นรูป ส่วนตัวหนังสือสองตัว (เลขอันดับ กับตัวอักษรแรกตอนไม่มีรูป)
 * เป็น div วางทับ เพราะ <text> ใน svg ทำให้ satori พังเหมือนกัน และวิธีนี้
 * ยังได้ฟอนต์ไทยที่โหลดไว้ด้วย ถ้าฝังใน svg resvg จะไม่มีฟอนต์ให้ใช้
 */
function StoryMug({ entry, width }: { entry: StoryEntry; width: number }) {
  const avatar = usableAvatar(entry.avatar);
  const height = mugHeight(width);
  const scale = width / MUG_VIEW.width;
  const ribbon = MUG_RIBBON_COLOR[entry.rankNo];
  const label = MUG_RIBBON_LABEL[entry.rankNo];
  const uri = `data:image/svg+xml;base64,${Buffer.from(
    mugSvg(avatar, entry.rankNo),
    "utf8",
  ).toString("base64")}`;

  return (
    <div style={{ display: "flex", position: "relative", width, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={uri} width={width} height={height} style={{ width, height }} />

      {avatar ? null : (
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: MUG_INNER.x * scale,
            top: MUG_INNER.y * scale,
            width: MUG_INNER.width * scale,
            height: MUG_INNER.height * scale,
            alignItems: "center",
            justifyContent: "center",
            color: MUG_BEER.initial,
            fontFamily: "PlexThai",
            fontWeight: 600,
            fontSize: Math.round(MUG_INITIAL_FONT * scale),
          }}
        >
          {entry.nickname.slice(0, 1).toUpperCase()}
        </div>
      )}

      {ribbon && label ? (
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: MUG_RIBBON_TEXT.x * scale,
            top: MUG_RIBBON_TEXT.y * scale,
            width: MUG_RIBBON_TEXT.width * scale,
            height: MUG_RIBBON_TEXT.height * scale,
            alignItems: "center",
            justifyContent: "center",
            color: ribbon.text,
            fontFamily: "PlexThai",
            fontWeight: 600,
            fontSize: Math.round(MUG_RIBBON_FONT * scale),
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

/**
 * ตัดข้อความให้สั้นพอที่จะไม่ล้นกรอบ
 *
 * satori ทำ text-overflow: ellipsis ให้ไม่ได้ ต้องตัดเป็นตัวอักษรเอาเองก่อน
 * ส่งเข้าไปวาด ตัวเลขเพดานได้มาจากความกว้างของกล่องหารด้วยความกว้างเฉลี่ย
 * ของตัวอักษรไทย เผื่อไว้พอสมควรเพราะแต่ละตัวกว้างไม่เท่ากัน
 */
function truncate(text: string | null, max: number): string | null {
  if (!text) return null;

  const clean = text.trim();
  if (!clean) return null;

  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export type StoryEntry = {
  memberId: string;
  nickname: string;
  caption: string | null;
  avatar: string | null;
  totalKm: string;
  runCount: number;
  rankNo: number;
  idle: boolean;
  /** โหมด % เท่านั้น null = ยังไม่ได้ตั้งเป้า */
  percent: string | null;
  /** โหมด % เท่านั้น เป้าจริงหลังรวมโหวต */
  finalKm: string | null;
};

/**
 * โพเดียมวาดแบบไหน
 *   mug    แก้วเบียร์ ใช้เป็นค่าปกติ
 *   square รูปสี่เหลี่ยมมุมมนแบบก่อนหน้านี้ เก็บไว้เป็นทางหนีทีไล่
 *
 * ถ้าวาดแบบแก้วแล้วพัง ฝั่ง route จะลองวาดใหม่ด้วยแบบ square ให้อัตโนมัติ
 * ดีกว่าปล่อยให้คนกดแล้วได้ 500 เปล่าๆ
 */
export type PodiumStyle = "mug" | "square";

/** สองกระดานใช้ดีไซน์เดียวกันทุกอย่าง ต่างแค่ตัวเลขที่เอามาแสดง */
export type StoryMode = "distance" | "percent";

/** ตัวเลขใหญ่ของแต่ละคน */
function bigNumber(entry: StoryEntry, mode: StoryMode): string {
  if (mode === "distance") return `${formatKm(entry.totalKm)} กม.`;
  return entry.percent === null ? "—" : formatPercent(entry.percent);
}

/** บรรทัดเล็กใต้ตัวเลขใหญ่ โหมดระยะรวมไม่มี */
function smallLine(entry: StoryEntry, mode: StoryMode): string | null {
  if (mode === "distance") return null;
  if (entry.percent === null) return "ยังไม่ได้ตั้งเป้า";
  return `${formatKm(entry.totalKm)} / ${formatKm(entry.finalKm ?? 0)} กม.`;
}

function Photo({
  avatar,
  nickname,
  width,
  height,
  radius,
  fontSize,
}: {
  avatar: string | null;
  nickname: string;
  width: number;
  height: number;
  radius: number;
  fontSize: number;
}) {
  if (avatar) {
    return (
      // satori แปลงแท็กนี้เป็นพิกเซลในไฟล์ PNG ไม่ได้ไปอยู่ใน DOM จริง
      // กฎเรื่อง next/image กับ alt จึงใช้ไม่ได้กับที่นี่
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      <img
        src={avatar}
        width={width}
        height={height}
        style={{
          width,
          height,
          borderRadius: radius,
          objectFit: "cover",
          // รูปโปรไฟล์เป็นทรงสูง 9:16 ส่วนช่องในแถวเตี้ยกว่านั้นมาก
          // ถ้าจัดกลางตามค่าปกติ หัวกับไหล่จะโดนตัดทิ้งเหลือแต่ลำตัว
          objectPosition: "top",
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        borderRadius: radius,
        backgroundColor: "#f0e4d4",
        alignItems: "center",
        justifyContent: "center",
        color: ACCENT,
        fontFamily: "PlexThai",
        fontWeight: 600,
        fontSize,
      }}
    >
      {nickname.slice(0, 1).toUpperCase()}
    </div>
  );
}

/** โพเดียมแบบเดิม รูปสี่เหลี่ยมมุมมนกับป้ายอันดับห้อยใต้รูป */
function SquarePodiumPhoto({
  entry,
  width,
  first,
}: {
  entry: StoryEntry;
  width: number;
  first: boolean;
}) {
  const height = first ? 360 : 280;

  return (
    <div style={{ display: "flex", position: "relative" }}>
      <Photo
        avatar={usableAvatar(entry.avatar)}
        nickname={entry.nickname}
        width={width}
        height={height}
        radius={28}
        fontSize={first ? 120 : 96}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -26,
          left: width / 2 - 26,
          width: 52,
          height: 52,
          borderRadius: 26,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: first ? ACCENT : CREAM,
          border: `3px solid ${ACCENT}`,
          color: first ? CREAM : ACCENT,
          fontFamily: "PlexThai",
          fontWeight: 600,
          fontSize: 28,
        }}
      >
        {entry.rankNo}
      </div>
    </div>
  );
}

/**
 * ความกว้างของแก้วแต่ละช่องเทียบกับที่ 1
 * ที่ 1 เต็มช่อง ที่ 2 กับที่ 3 เล็กลงตามลำดับ ชุดเดียวกับฝั่งเว็บ
 */
const MUG_SCALE: Record<number, number> = { 1: 1, 2: 0.8, 3: 0.67 };

/**
 * ความกว้างของช่องหนึ่งช่อง ใช้ทั้งแถวแก้วและแถวตัวหนังสือ
 * สองแถวต้องเรียกตัวนี้เหมือนกัน ช่องที่ i ของสองแถวจึงตรงแนวกันเสมอ
 */
function podiumSlotWidth(
  entry: StoryEntry,
  first: boolean,
  podiumStyle: PodiumStyle,
  density: Density,
): number {
  if (podiumStyle === "square") return first ? 270 : 210;
  return Math.round(density.mugFirst * (MUG_SCALE[entry.rankNo] ?? 1));
}

/**
 * ช่องหนึ่งช่องในแถวแก้ว
 *
 * ทุกช่องกว้างเท่ากัน (เท่ากับแก้วใบใหญ่สุด) แล้วเอาแก้วไปวางกลางช่อง
 * แถวนี้สูงตามแก้วใบที่สูงที่สุดและจัดชิดล่าง ฐานแก้วทั้งสามจึงเสมอกันเสมอ
 * ไม่ว่าใครจะมีคำโปรยยาวแค่ไหน เพราะคำโปรยไปอยู่อีกแถวหนึ่งข้างล่าง
 */
function PodiumMugCell({
  entry,
  first,
  podiumStyle,
  density,
}: {
  entry: StoryEntry;
  first: boolean;
  podiumStyle: PodiumStyle;
  density: Density;
}) {
  const width = podiumSlotWidth(entry, first, podiumStyle, density);

  return (
    <div
      style={{
        display: "flex",
        width,
        justifyContent: "center",
        alignItems: "flex-end",
        // แบบ square มีป้ายเลขอันดับห้อยใต้รูป 26px ถ้าไม่เว้นที่ให้
        // ป้ายจะไปคร่อมเส้นเคาน์เตอร์จนอ่านเลขไม่ออก
        paddingBottom: podiumStyle === "square" ? 30 : 0,
      }}
    >
      {podiumStyle === "square" ? (
        <SquarePodiumPhoto entry={entry} width={width} first={first} />
      ) : (
        <StoryMug entry={entry} width={width} />
      )}
    </div>
  );
}

/** ชื่อ ตัวเลข และคำโปรย ของหนึ่งช่อง อยู่ใต้เส้นเคาน์เตอร์ */
function PodiumTextCell({
  entry,
  first,
  mode,
  podiumStyle,
  density,
}: {
  entry: StoryEntry;
  first: boolean;
  mode: StoryMode;
  podiumStyle: PodiumStyle;
  density: Density;
}) {
  const width = podiumSlotWidth(entry, first, podiumStyle, density);
  const nameSize = first ? density.podiumNameFirst : density.podiumNameSide;
  const valueSize = first ? density.podiumValueFirst : density.podiumValueSide;
  // ให้คำโปรยตัดบรรทัดได้ถึงสามบรรทัด ของเดิมตัดเหลือบรรทัดเดียวครึ่ง
  // ที่ 28/22 ตัวอักษร จนคำโปรยของสามคนบนโพเดียมขาดกลางประโยคแทบทุกคน
  // เพดานตัวอักษรยังต้องมีไว้กันคำโปรยยาวผิดปกติ ส่วน lineClamp ข้างล่าง
  // เป็นตัวกันจริงไม่ให้เกินสามบรรทัด
  const caption = density.showPodiumCaption
    ? truncate(entry.caption, first ? 72 : 60)
    : null;
  const small = smallLine(entry, mode);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width,
      }}
    >
      {/* กันที่ให้ชื่อสองบรรทัดเสมอ ชื่อยาวอย่าง "angkuji run slow" จะได้ไม่
          ดันบรรทัดระยะของช่องนั้นให้ต่ำกว่าอีกสองช่อง แถวตัวเลขจึงตรงแนวกัน */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // ตรึงความสูงด้วยฟอนต์ตัวใหญ่สุดเสมอ ไม่ใช่ตามขนาดของช่องตัวเอง
          // ไม่งั้นช่องอันดับ 1 จะดันบรรทัดตัวเลขลงไปต่ำกว่าอีกสองช่อง
          height: Math.round(density.podiumNameFirst * 1.22 * 2),
          width,
          overflow: "hidden",
          textAlign: "center",
          color: INK,
          fontSize: nameSize,
          lineHeight: 1.22,
          fontWeight: 600,
        }}
      >
        {entry.nickname}
      </div>
      <div
        style={{
          display: "flex",
          color: ACCENT,
          fontFamily: "PlexThai",
          fontWeight: 600,
          fontSize: valueSize,
        }}
      >
        {bigNumber(entry, mode)}
      </div>

      {small ? (
        <div
          style={{
            display: "flex",
            marginTop: 2,
            color: MUTED,
            // ย่อตามความกว้างแก้ว ไม่งั้นพอแก้วแคบลงเพราะคนเยอะ
            // "271.69 / 121.00 กม." จะตกบรรทัดจนคำว่า กม. ไปอยู่คนเดียว
            fontSize: Math.round(density.podiumNameSide * 0.74),
          }}
        >
          {small}
        </div>
      ) : null}

      {caption ? (
        <div
          style={{
            display: "flex",
            marginTop: 4,
            width,
            justifyContent: "center",
            textAlign: "center",
            color: MUTED,
            fontSize: 20,
            lineHeight: 1.3,
            lineClamp: 3,
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );
}

/**
 * หนึ่งแถวในรายการ
 *
 * ทุกขนาดมาจาก tier ไม่มีตัวเลขตายตัวในนี้เลย เพราะแถวต้องเล็กลงได้ตามจำนวนคน
 * width ของแถวถูกกำหนดจากข้างนอก (คอลัมน์) แถวจึงไม่ต้องรู้ว่าตัวเองอยู่
 * คอลัมน์เดียวหรือสองคอลัมน์
 */
function ListRow({
  entry,
  mode,
  tier,
  rowWidth,
}: {
  entry: StoryEntry;
  mode: StoryMode;
  tier: ListTier;
  rowWidth: number;
}) {
  // แถวแน่นๆ ตัดบรรทัดเล็กใต้ตัวเลขทิ้ง สูงสองบรรทัดในแถว 48px อ่านไม่ออกอยู่ดี
  const small = tier.showSecondary ? smallLine(entry, mode) : null;

  // ตัวเลขทางขวาต้องมีที่ของตัวเองตายตัว ไม่งั้นชื่อยาวๆ จะดันจนตัวเลขหลุดขอบ
  // หรือไปทับกัน satori ไม่มี text-overflow ให้ใช้ จึงต้องกั้นที่เองแบบนี้
  //
  // โหมด % กว้างกว่าที่ตาเห็น เพราะใต้ "174%" ยังมี "255.07 / 123.00 กม."
  // ซึ่งยาวกว่าตัวเลขเปอร์เซ็นต์หลายเท่า ต้องกันที่ตามบรรทัดที่ยาวที่สุด
  const valueWidth = Math.round(
    mode === "percent"
      ? Math.max(tier.valueSize * 4.2, small ? tier.smallSize * 10.6 : 0)
      : tier.valueSize * 5.4,
  );
  const nameWidth =
    rowWidth - 16 - tier.rankWidth - 6 - tier.photoWidth - 10 - valueWidth;

  /** ตัดข้อความให้พอดีกับความกว้างที่มี ไทยกับอังกฤษกว้างราว 0.55 เท่าของขนาดฟอนต์ */
  const fit = (text: string | null, fontSize: number) =>
    truncate(text, Math.max(4, Math.floor(nameWidth / (fontSize * 0.55))));

  // แคปชั่นมาก่อน ถ้าไม่มีค่อยบอกจำนวนครั้ง ไม่มีทั้งคู่ก็ไม่ต้องมีบรรทัดรอง
  const secondary = tier.showSecondary
    ? (fit(entry.caption, tier.subSize) ??
      (entry.runCount > 0 ? `${entry.runCount} ครั้ง` : null))
    : null;
  const name = fit(entry.nickname, tier.nameSize) ?? entry.nickname;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: tier.rowHeight,
        paddingLeft: 8,
        paddingRight: 8,
        borderBottom: `2px solid ${LINE}`,
      }}
    >
      <div
        style={{
          display: "flex",
          width: tier.rankWidth,
          flexShrink: 0,
          justifyContent: "center",
          color: MUTED,
          fontSize: tier.rankSize,
        }}
      >
        {entry.rankNo}
      </div>

      <div
        style={{
          display: "flex",
          flexShrink: 0,
          marginLeft: 6,
          marginRight: 10,
        }}
      >
        <Photo
          avatar={usableAvatar(entry.avatar)}
          nickname={entry.nickname}
          width={tier.photoWidth}
          height={tier.photoHeight}
          radius={tier.photoRadius}
          fontSize={Math.round(tier.photoWidth * 0.52)}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: nameWidth,
          flexShrink: 0,
          // ตัดด้วย … มาตั้งแต่ต้นแล้ว overflow hidden กันไว้อีกชั้น
          // เผื่อตัวอักษรบางตัวกว้างกว่าที่เผื่อไว้
          overflow: "hidden",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            color: INK,
            fontSize: tier.nameSize,
            fontWeight: 600,
          }}
        >
          {name}
        </div>
        {secondary ? (
          <div
            style={{ display: "flex", color: MUTED, fontSize: tier.subSize }}
          >
            {secondary}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          width: valueWidth,
          flexShrink: 0,
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            color: INK,
            fontFamily: "PlexThai",
            fontWeight: 600,
            fontSize: tier.valueSize,
          }}
        >
          {bigNumber(entry, mode)}
        </div>
        {small ? (
          <div
            style={{ display: "flex", color: MUTED, fontSize: tier.smallSize }}
          >
            {small}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StoryCard({
  logo,
  periodLabel,
  memberCount,
  podium,
  rows,
  totalKm,
  mode = "distance",
  totalLabel = "รวมทั้งกลุ่ม",
  podiumStyle = "mug",
  idleCount = 0,
}: {
  logo: string;
  periodLabel: string;
  memberCount: number;
  podium: StoryEntry[];
  rows: StoryEntry[];
  totalKm: number;
  mode?: StoryMode;
  totalLabel?: string;
  podiumStyle?: PodiumStyle;
  /** คนที่ยังไม่มีผลในเดือนนั้น ไม่ได้เป็นแถว แต่สรุปเป็นบรรทัดเดียวท้ายรายการ */
  idleCount?: number;
}) {
  // ไม่ตัดใครทิ้งแล้ว ทุกคนที่มีผลได้ขึ้นรูปครบ ย่อขนาดลงแทนถ้าคนเยอะ
  const density = pickDensity(rows.length);
  const tier = density.list;
  const perColumn = rowsPerColumn(rows.length, tier.columns);
  const columnWidth =
    tier.columns === 1
      ? CONTENT_WIDTH
      : Math.floor((CONTENT_WIDTH - COLUMN_GAP) / 2);
  // แบ่งครึ่งแบบอ่านลงล่างจนสุดคอลัมน์ซ้ายก่อน แล้วค่อยขึ้นหัวคอลัมน์ขวา
  const columns =
    tier.columns === 1
      ? [rows]
      : [rows.slice(0, perColumn), rows.slice(perColumn)];

  // เรียงโพเดียมเป็น 2 - 1 - 3 เหมือนบนเว็บ ติดธง first ไปกับตัวข้อมูลเลย
  // เพราะถ้ามีคนวิ่งไม่ครบสามคน ลำดับใน array จะเลื่อน เดาจาก index ไม่ได้
  const arranged = [
    podium[1] ? { entry: podium[1], first: false } : null,
    podium[0] ? { entry: podium[0], first: true } : null,
    podium[2] ? { entry: podium[2], first: false } : null,
  ].filter((slot) => slot !== null);

  // ความกว้างรวมของโพเดียม ใช้วางเส้นเคาน์เตอร์กับจัดวงแสงให้ตรงกลาง
  const podiumWidth =
    arranged.reduce(
      (sum, slot) =>
        sum + podiumSlotWidth(slot.entry, slot.first, podiumStyle, density),
      0,
    ) +
    Math.max(0, arranged.length - 1) * PODIUM_GAP;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        backgroundColor: CREAM,
        color: INK,
        fontFamily: "Anuphan",
        paddingTop: 60,
        paddingBottom: 52,
        paddingLeft: 56,
        paddingRight: 56,
        alignItems: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img
        src={logo}
        width={density.logo}
        height={density.logo}
        style={{
          width: density.logo,
          height: density.logo,
          borderRadius: 28,
          flexShrink: 0,
        }}
      />

      {/* flexShrink: 0 กับ lineHeight ที่ระบุชัด สำคัญมาก
          กล่องนอกสูงตายตัว 1920 ถ้าเนื้อหารวมสูงเกิน yoga จะบีบทุกกล่องที่
          ยอมให้บีบได้ กล่องข้อความจะเตี้ยลงจนตัวอักษรล้นออกมาทับกล่องถัดไป
          ซึ่งเคยทำให้บรรทัดเดือนไปทับหัว BEER NOW RUN LATER มาแล้ว */}
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          marginTop: 22,
          fontFamily: "PlexThai",
          fontWeight: 600,
          fontSize: 58,
          lineHeight: 1.25,
          letterSpacing: -1,
        }}
      >
        BEER NOW RUN LATER
      </div>

      <div
        style={{
          display: "flex",
          flexShrink: 0,
          marginTop: 10,
          color: MUTED,
          fontSize: 30,
          lineHeight: 1.4,
        }}
      >
        {periodLabel} · {memberCount} คน
      </div>

      {arranged.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 60,
            height: 420,
            width: "100%",
            borderRadius: 32,
            border: `4px dashed ${ACCENT}`,
            color: ACCENT,
            fontFamily: "PlexThai",
            fontWeight: 600,
            fontSize: 44,
          }}
        >
          {mode === "percent" ? "ยังไม่มีใครตั้งเป้าเลย" : "ยังไม่มีใครกรอกผลเลย"}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            flexDirection: "column",
            alignItems: "center",
            marginTop: 30,
            position: "relative",
          }}
        >
          {/* แสงสปอตไลต์หลังแก้วที่ 1
              satori ทำ radial-gradient ไม่ได้ จึงใช้รูปที่วาดมาแล้วเป็นวงแสง
              วางไว้ก่อนแก้วเพื่อให้อยู่ข้างหลัง ไม่ได้ใช้ zIndex เพราะ satori
              เรียงตามลำดับที่เขียนเท่านั้น */}
          {podiumStyle === "mug" ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              src={SPOTLIGHT_URI}
              width={SPOTLIGHT_SIZE}
              height={SPOTLIGHT_SIZE}
              style={{
                position: "absolute",
                left: Math.round((podiumWidth - SPOTLIGHT_SIZE) / 2),
                top: -Math.round(SPOTLIGHT_SIZE * 0.12),
                width: SPOTLIGHT_SIZE,
                height: SPOTLIGHT_SIZE,
                opacity: 0.5,
              }}
            />
          ) : null}

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: PODIUM_GAP,
            }}
          >
            {arranged.map((slot) => (
              <PodiumMugCell
                key={slot.entry.memberId}
                entry={slot.entry}
                first={slot.first}
                podiumStyle={podiumStyle}
                density={density}
              />
            ))}
          </div>

          {/* เส้นเคาน์เตอร์ที่แก้วทั้งสามใบวางอยู่ */}
          <div
            style={{
              display: "flex",
              width: podiumWidth,
              height: 10,
              borderRadius: 5,
              backgroundColor: COUNTER,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "center",
              marginTop: 14,
              gap: PODIUM_GAP,
            }}
          >
            {arranged.map((slot) => (
              <PodiumTextCell
                key={slot.entry.memberId}
                entry={slot.entry}
                first={slot.first}
                mode={mode}
                podiumStyle={podiumStyle}
                density={density}
              />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          marginTop: 36,
          flexGrow: 1,
          // รายการเป็นกล่องเดียวที่ยอมให้ยืดหดได้ ที่เหลือตรึงไว้หมด
          // จัดกลางแนวตั้ง เพราะเดือนที่มีคนวิ่งไม่กี่คนจะเหลือที่ว่างเยอะ
          // ถ้าชิดบนจะดูเหมือนรูปขาดครึ่งล่าง
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            gap: COLUMN_GAP,
          }}
        >
          {columns.map((column, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                width: columnWidth,
              }}
            >
              {column.map((entry) => (
                <ListRow
                  key={entry.memberId}
                  entry={entry}
                  mode={mode}
                  tier={tier}
                  rowWidth={columnWidth}
                />
              ))}
            </div>
          ))}
        </div>

        {/* คนที่ยังไม่มีผลไม่ได้เป็นแถว เพราะจะไปเบียดที่ของคนที่วิ่งจริง
            แต่ก็ไม่หายไปเฉยๆ สรุปไว้บรรทัดเดียวให้รู้ว่ายังมีคนรออยู่ */}
        {idleCount > 0 ? (
          <div
            style={{
              display: "flex",
              marginTop: 14,
              justifyContent: "center",
              color: MUTED,
              fontSize: 24,
            }}
          >
            {mode === "percent"
              ? `ยังไม่ได้ตั้งเป้า ${idleCount} คน`
              : `ยังไม่เริ่ม ${idleCount} คน`}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          width: "100%",
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 20,
          paddingLeft: 40,
          paddingRight: 40,
          height: 118,
          borderRadius: 28,
          backgroundColor: INK,
          color: CREAM,
        }}
      >
        <div style={{ display: "flex", fontSize: 32 }}>{totalLabel}</div>
        <div
          style={{
            display: "flex",
            fontFamily: "PlexThai",
            fontWeight: 600,
            fontSize: 48,
          }}
        >
          {/* โหมด % ผลรวมของเปอร์เซ็นต์ไม่มีความหมาย จึงใช้ค่าเฉลี่ยแทน
              และต้องลงท้ายด้วย % ไม่ใช่ กม. */}
          {mode === "percent"
            ? formatPercent(totalKm)
            : `${formatKm(totalKm)} กม.`}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexShrink: 0,
          marginTop: 24,
          color: MUTED,
          fontSize: 24,
          letterSpacing: 4,
        }}
      >
        GOOD PACE · GOOD PLACE · GOOD PEOPLE
      </div>
    </div>
  );
}
