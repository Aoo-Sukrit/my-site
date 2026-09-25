import { formatKm } from "@/lib/date";

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
const MAX_ROWS = 8;

export type StoryEntry = {
  memberId: string;
  nickname: string;
  avatar: string | null;
  totalKm: string;
  runCount: number;
  rankNo: number;
  idle: boolean;
};

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

function PodiumSlot({ entry, first }: { entry: StoryEntry; first: boolean }) {
  const width = first ? 300 : 236;
  const height = first ? 400 : 314;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width,
      }}
    >
      <div style={{ display: "flex", position: "relative" }}>
        <Photo
          avatar={entry.avatar}
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

      <div
        style={{
          display: "flex",
          marginTop: 42,
          color: INK,
          fontSize: first ? 34 : 28,
          fontWeight: 600,
          maxWidth: width,
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
        {formatKm(entry.totalKm)} กม.
      </div>
    </div>
  );
}

function ListRow({ entry }: { entry: StoryEntry }) {
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
        <div style={{ display: "flex", color: MUTED, fontSize: 22 }}>
          {entry.idle ? "ยังไม่ได้กรอก" : `${entry.runCount} ครั้ง`}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          color: INK,
          fontFamily: "PlexThai",
          fontWeight: 600,
          fontSize: 30,
        }}
      >
        {formatKm(entry.totalKm)} กม.
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
}: {
  logo: string;
  periodLabel: string;
  memberCount: number;
  podium: StoryEntry[];
  rows: StoryEntry[];
  totalKm: number;
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
        style={{ width: 168, height: 168, borderRadius: 28 }}
      />

      <div
        style={{
          display: "flex",
          marginTop: 22,
          fontFamily: "PlexThai",
          fontWeight: 600,
          fontSize: 58,
          letterSpacing: -1,
        }}
      >
        BEER NOW RUN LATER
      </div>

      <div style={{ display: "flex", marginTop: 8, color: MUTED, fontSize: 30 }}>
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
          ยังไม่มีใครกรอกผลเลย
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
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
        }}
      >
        {shown.map((entry) => (
          <ListRow key={entry.memberId} entry={entry} />
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
        <div style={{ display: "flex", fontSize: 32 }}>รวมทั้งกลุ่ม</div>
        <div
          style={{
            display: "flex",
            fontFamily: "PlexThai",
            fontWeight: 600,
            fontSize: 48,
          }}
        >
          {formatKm(totalKm)} กม.
        </div>
      </div>

      <div
        style={{
          display: "flex",
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
