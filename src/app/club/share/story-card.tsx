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
  MUG_PRINT,
  MUG_SHADOW_OFFSET,
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

/** จำนวนแถวที่ยัดลงในหน้าได้พอดี เกินกว่านี้สรุปเป็นบรรทัดเดียว */
const MAX_ROWS = 7;

/**
 * ความสูงของกล่องรูปในโพเดียม เท่ากันทั้งสามช่องโดยตั้งใจ
 *
 * ถ้าปล่อยให้แต่ละช่องสูงตามเนื้อหา คนที่ไม่มีแคปชั่นจะมีคอลัมน์เตี้ยกว่า
 * พอจัดชิดล่างรูปของคนนั้นจะถูกดันต่ำลงมา แถวโพเดียมเลยดูเบี้ยว
 * ตรึงความสูงกล่องรูปไว้เท่ากัน แล้ววางรูปชิดล่างในกล่อง
 * ชื่อกับระยะของทั้งสามช่องจึงเริ่มที่ระดับเดียวกันเสมอ
 */
const MUG_WIDTH_FIRST = 360;
const MUG_WIDTH_SIDE = 276;

/** แก้วสูงเท่าไหร่เมื่อกว้างเท่านี้ อัตราส่วนล็อกตามกรอบวาด */
function mugHeight(width: number) {
  return Math.round((width * MUG_VIEW.height) / MUG_VIEW.width);
}

const PODIUM_PHOTO_BOX = mugHeight(MUG_WIDTH_FIRST);

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

/**
 * รูปคนอยู่ในแก้วเบียร์ สำหรับรูปสตอรี่
 *
 * ทรงแก้วเป็น <svg> เหมือนฝั่งเว็บ แต่ตัวหนังสือ (เลขอันดับกับตัวอักษรแรก)
 * ต้องเป็น <div> วางทับข้างนอก svg เพราะ satori พังทั้งรูปถ้ามี <text> ใน svg
 * path ทุกเส้นมาจาก src/lib/beer-mug.ts ชุดเดียวกับฝั่งเว็บ
 */
function StoryMug({
  entry,
  width,
  first,
}: {
  entry: StoryEntry;
  width: number;
  first: boolean;
}) {
  const height = mugHeight(width);
  const scale = width / MUG_VIEW.width;
  const shadow = first ? MUG_PRINT.goldShadow : MUG_PRINT.inkShadow;
  const clipId = `mug-${entry.memberId}`;
  const badgeSize = MUG_BADGE.r * 2 * scale;

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width,
        height,
      }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${MUG_VIEW.width} ${MUG_VIEW.height}`}>
        <defs>
          <clipPath id={clipId}>
            <path d={MUG_BODY_PATH} />
          </clipPath>
        </defs>
        <g
          transform={`translate(${MUG_SHADOW_OFFSET},${MUG_SHADOW_OFFSET})`}
          fill={shadow}
          stroke={shadow}
        >
          <path d={MUG_HANDLE_PATH} fill="none" strokeWidth={MUG_HANDLE_STROKE} />
          <path d={MUG_FOAM_PATH} />
          <path d={MUG_BODY_PATH} />
        </g>
        <path
          d={MUG_HANDLE_PATH}
          fill="none"
          stroke={MUG_PRINT.outline}
          strokeWidth={MUG_HANDLE_STROKE}
        />
        <path d={MUG_BODY_PATH} fill={MUG_PRINT.emptyFill} />
        {entry.avatar ? (
          <image
            href={entry.avatar}
            x={MUG_PHOTO_BOX.x}
            y={MUG_PHOTO_BOX.y}
            width={MUG_PHOTO_BOX.width}
            height={MUG_PHOTO_BOX.height}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        ) : null}
        <path
          d={MUG_BODY_PATH}
          fill="none"
          stroke={MUG_PRINT.outline}
          strokeWidth={MUG_STROKE}
          strokeLinejoin="round"
        />
        <path
          d={MUG_FOAM_PATH}
          fill={MUG_PRINT.foam}
          stroke={MUG_PRINT.outline}
          strokeWidth={MUG_STROKE}
          strokeLinejoin="round"
        />
        <circle cx={MUG_BADGE.cx} cy={MUG_BADGE.cy} r={MUG_BADGE.r} fill={shadow} />
      </svg>

      {entry.avatar ? null : (
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
            color: MUG_PRINT.emptyText,
            fontFamily: "PlexThai",
            fontWeight: 600,
            fontSize: Math.round(MUG_INITIAL_FONT * scale),
          }}
        >
          {entry.nickname.slice(0, 1).toUpperCase()}
        </div>
      )}

      <div
        style={{
          display: "flex",
          position: "absolute",
          left: (MUG_BADGE.cx - MUG_BADGE.r) * scale,
          top: (MUG_BADGE.cy - MUG_BADGE.r) * scale,
          width: badgeSize,
          height: badgeSize,
          alignItems: "center",
          justifyContent: "center",
          color: MUG_PRINT.badgeText,
          fontFamily: "PlexThai",
          fontWeight: 600,
          fontSize: Math.round(MUG_BADGE_FONT * scale),
        }}
      >
        {entry.rankNo}
      </div>
    </div>
  );
}

function PodiumSlot({
  entry,
  first,
  mode,
}: {
  entry: StoryEntry;
  first: boolean;
  mode: StoryMode;
}) {
  const width = first ? MUG_WIDTH_FIRST : MUG_WIDTH_SIDE;
  const caption = truncate(entry.caption, first ? 28 : 22);
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
      <div
        style={{
          display: "flex",
          height: PODIUM_PHOTO_BOX,
          alignItems: "flex-end",
        }}
      >
        <StoryMug entry={entry} width={width} first={first} />
      </div>

      {/* กันที่ให้ชื่อสองบรรทัดเสมอ ชื่อยาวอย่าง "angkuji run slow" จะได้ไม่
          ดันบรรทัดระยะของช่องนั้นให้ต่ำกว่าอีกสองช่อง แถวตัวเลขจึงตรงแนวกัน */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          marginTop: 14,
          // ตรึงความสูงด้วยฟอนต์ตัวใหญ่สุดเสมอ ไม่ใช่ตามขนาดของช่องตัวเอง
          // ไม่งั้นช่องอันดับ 1 ซึ่งตัวหนังสือใหญ่กว่าจะดันบรรทัดตัวเลขลงไปต่ำกว่า
          // อีกสองช่อง แถวตัวเลขของโพเดียมจะไม่ตรงแนวกัน
          height: Math.round(34 * 1.22 * 2),
          width,
          overflow: "hidden",
          textAlign: "center",
          color: INK,
          fontSize: first ? 34 : 28,
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
          fontSize: first ? 38 : 32,
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
            fontSize: 22,
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
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );
}

function ListRow({ entry, mode }: { entry: StoryEntry; mode: StoryMode }) {
  // แคปชั่นมาก่อน ถ้าไม่มีค่อยบอกจำนวนครั้ง ไม่มีทั้งคู่ก็ไม่ต้องมีบรรทัดรอง
  const secondary =
    truncate(entry.caption, 44) ??
    (entry.idle
      ? mode === "percent"
        ? "ยังไม่ได้ตั้งเป้า"
        : "ยังไม่ได้กรอก"
      : entry.runCount > 0
        ? `${entry.runCount} ครั้ง`
        : null);
  const small = smallLine(entry, mode);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 92,
        paddingLeft: 12,
        paddingRight: 12,
        borderBottom: `2px solid ${LINE}`,
        opacity: entry.idle ? 0.55 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 56,
          justifyContent: "center",
          color: MUTED,
          fontSize: 28,
        }}
      >
        {entry.idle ? "—" : entry.rankNo}
      </div>

      <div style={{ display: "flex", marginLeft: 8, marginRight: 20 }}>
        <Photo
          avatar={entry.avatar}
          nickname={entry.nickname}
          width={54}
          height={72}
          radius={12}
          fontSize={28}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", color: INK, fontSize: 30, fontWeight: 600 }}>
          {entry.nickname}
        </div>
        {secondary ? (
          <div style={{ display: "flex", color: MUTED, fontSize: 22 }}>
            {secondary}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
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
            fontSize: 30,
          }}
        >
          {bigNumber(entry, mode)}
        </div>
        {small ? (
          <div style={{ display: "flex", color: MUTED, fontSize: 20 }}>
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
}: {
  logo: string;
  periodLabel: string;
  memberCount: number;
  podium: StoryEntry[];
  rows: StoryEntry[];
  totalKm: number;
  mode?: StoryMode;
  totalLabel?: string;
}) {
  const shown = rows.length > MAX_ROWS ? rows.slice(0, MAX_ROWS - 1) : rows;
  const hidden = rows.length - shown.length;

  // เรียงโพเดียมเป็น 2 - 1 - 3 เหมือนบนเว็บ ติดธง first ไปกับตัวข้อมูลเลย
  // เพราะถ้ามีคนวิ่งไม่ครบสามคน ลำดับใน array จะเลื่อน เดาจาก index ไม่ได้
  const arranged = [
    podium[1] ? { entry: podium[1], first: false } : null,
    podium[0] ? { entry: podium[0], first: true } : null,
    podium[2] ? { entry: podium[2], first: false } : null,
  ].filter((slot) => slot !== null);

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
        width={168}
        height={168}
        style={{ width: 168, height: 168, borderRadius: 28, flexShrink: 0 }}
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
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "center",
            marginTop: 44,
            gap: 24,
          }}
        >
          {arranged.map((slot) => (
            <PodiumSlot
              key={slot.entry.memberId}
              entry={slot.entry}
              first={slot.first}
              mode={mode}
            />
          ))}
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
          overflow: "hidden",
        }}
      >
        {shown.map((entry) => (
          <ListRow key={entry.memberId} entry={entry} mode={mode} />
        ))}

        {hidden > 0 ? (
          <div
            style={{
              display: "flex",
              height: 92,
              alignItems: "center",
              justifyContent: "center",
              color: MUTED,
              fontSize: 26,
            }}
          >
            และอีก {hidden} คน
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
