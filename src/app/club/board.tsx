import Link from "next/link";

import { PortraitAvatar } from "@/components/club/avatar";
import BeerMug from "@/components/club/beer-mug";
import { formatKm, formatPercent } from "@/lib/date";
import type { LeaderboardRow, PercentRow } from "@/lib/supabase/types";

/** ลำดับการวางแบบโพเดียมจริง ซ้าย 2 กลาง 1 ขวา 3 */
const PODIUM_ORDER = [1, 0, 2] as const;

/**
 * ความกว้างของแต่ละช่องเทียบกับที่ 1
 *
 * ที่ 1 เต็มคอลัมน์ ที่ 2 กับที่ 3 เล็กลงตามลำดับ ใช้ max-w ไม่ใช่คอลัมน์กว้าง
 * ไม่เท่ากัน เพราะทั้งสามคอลัมน์ต้องกว้างเท่ากันไว้ให้ชื่อกับระยะข้างล่าง
 * ไม่งั้นช่องแคบจะตัดคำชื่อทิ้งเร็วกว่าช่องอื่นทั้งที่ชื่อยาวพอๆ กัน
 */
const MUG_SCALE: Record<number, string> = {
  1: "w-full",
  2: "w-[80%]",
  3: "w-[67%]",
};

/**
 * แก้วหนึ่งใบบนเส้นเคาน์เตอร์
 *
 * ฐานแก้วเสมอกันเสมอ เพราะแถวแก้วเป็นแถวของตัวเองที่สูงตามแก้วใบที่ 1
 * แล้วจัดชิดล่าง ส่วนชื่อ ระยะ และคำโปรยอยู่คนละแถวใต้เส้นเคาน์เตอร์
 * คำโปรยจะยาวแค่ไหนก็ดันแก้วไม่ได้ เพราะอยู่คนละแถวกัน
 *
 * (ของเดิมเอาทุกอย่างไว้ในคอลัมน์เดียวแล้วใช้ items-end ตัวที่ไม่มีคำโปรย
 * จึงเตี้ยกว่า พอจัดชิดล่างแก้วของคนนั้นเลยถูกดันต่ำลงกว่าเพื่อน)
 */
function PodiumMug({ row }: { row: LeaderboardRow }) {
  return (
    <div className={`${MUG_SCALE[row.rank_no] ?? "w-full"} relative`}>
      {row.rank_no === 1 ? <Spotlight /> : null}
      <BeerMug
        uid={row.member_id}
        src={row.avatar_url}
        nickname={row.nickname}
        rank={row.rank_no}
      />
    </div>
  );
}

/**
 * แสงสปอตไลต์จางๆ หลังแก้วที่ 1
 * aria-hidden เพราะเป็นของประดับล้วน ไม่ได้บอกข้อมูลอะไรกับคนที่ใช้โปรแกรมอ่านจอ
 */
function Spotlight() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -inset-x-[35%] -top-[12%] bottom-0 -z-10 rounded-full bg-[radial-gradient(ellipse_at_center,var(--color-club-gold)_0%,transparent_65%)] opacity-20"
    />
  );
}

function PodiumText({ row, first }: { row: LeaderboardRow; first: boolean }) {
  return (
    <>
      <p
        className={`truncate font-medium ${first ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}
      >
        {row.nickname}
      </p>
      <p
        className={`truncate font-display font-semibold text-accent-strong ${
          first ? "text-base sm:text-lg" : "text-sm"
        }`}
      >
        {formatKm(row.total_km)}
        <span className="text-xs font-normal text-muted"> กม.</span>
      </p>
      {row.caption ? (
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">
          {row.caption}
        </p>
      ) : null}
    </>
  );
}

/**
 * โพเดียม 3 อันดับแรก
 *
 * โครงเป็นสองแถวซ้อนกัน แถวบนคือแก้ว แถวล่างคือตัวหนังสือ คั่นด้วยเส้นเคาน์เตอร์
 * ทั้งสองแถวใช้ grid สามคอลัมน์เท่ากันและเรียงลำดับเดียวกัน ช่องที่ i ของสองแถว
 * จึงตรงกันเสมอ ไม่ต้องพึ่งความสูงของเนื้อหาในการจัดแนว
 *
 * ใช้ grid ตายตัว ไม่ใช่ flex-wrap เพราะต้องอยู่แถวเดียวกันบนมือถือเสมอ
 */
export function Podium({ top }: { top: LeaderboardRow[] }) {
  return (
    <PodiumFrame
      slots={PODIUM_ORDER.map((index) => top[index] ?? null)}
      mug={(row) => <PodiumMug row={row} />}
      text={(row, first) => <PodiumText row={row} first={first} />}
    />
  );
}

/**
 * โครงโพเดียมที่กระดานระยะรวมกับกระดาน % ใช้ร่วมกัน
 *
 * รับแถวมาเรียงตามตำแหน่งบนจอแล้ว (ซ้าย กลาง ขวา) ช่องว่างเป็น null ได้
 * ตอนเดือนนั้นมีคนวิ่งไม่ถึงสามคน
 */
function PodiumFrame<Row extends { member_id: string; rank_no: number }>({
  slots,
  mug,
  text,
}: {
  slots: (Row | null)[];
  mug: (row: Row) => React.ReactNode;
  text: (row: Row, first: boolean) => React.ReactNode;
}) {
  return (
    <div>
      {/* แถวแก้ว สูงตามแก้วใบที่สูงที่สุด แล้วจัดทุกใบชิดล่าง ฐานจึงเสมอกัน */}
      <ul className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {slots.map((row, index) =>
          row ? (
            <li key={row.member_id} className="flex justify-center">
              {mug(row)}
            </li>
          ) : (
            <li key={index} aria-hidden />
          ),
        )}
      </ul>

      {/* เส้นเคาน์เตอร์ที่แก้วทั้งสามใบวางอยู่ */}
      <div
        aria-hidden
        className="h-1.5 rounded-full bg-club-line/70 sm:h-2"
      />

      <ul className="mt-2 grid grid-cols-3 gap-2 text-center sm:gap-4">
        {slots.map((row, index) =>
          row ? (
            <li key={row.member_id} className="min-w-0">
              <Link
                href={`/club/member/${row.member_id}`}
                className="block transition-opacity hover:opacity-90"
              >
                {text(row, row.rank_no === 1)}
              </Link>
            </li>
          ) : (
            <li key={index} aria-hidden />
          ),
        )}
      </ul>
    </div>
  );
}

/**
 * อันดับ 4 ลงมา รวมอยู่ในการ์ดใบเดียว
 * คนที่ยังไม่วิ่งต่อท้ายสุด ใช้ขีดแทนเลขอันดับและจางกว่า
 */
export function RankList({
  ranked,
  idle,
}: {
  ranked: LeaderboardRow[];
  idle: LeaderboardRow[];
}) {
  if (ranked.length === 0 && idle.length === 0) return null;

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {ranked.map((row) => (
        <RankRow key={row.member_id} row={row} />
      ))}
      {idle.map((row) => (
        <RankRow key={row.member_id} row={row} idle />
      ))}
    </ul>
  );
}

function secondaryLine(row: LeaderboardRow, idle?: boolean): string | null {
  if (row.caption) return row.caption;
  if (idle) return "ยังไม่ได้กรอก";
  if (row.run_count > 0) return `${row.run_count} ครั้ง`;
  return null;
}

function RankRow({ row, idle }: { row: LeaderboardRow; idle?: boolean }) {
  return (
    <li>
      <Link
        href={`/club/member/${row.member_id}`}
        className={`flex min-h-16 items-center gap-3 px-3 py-2 transition-colors hover:bg-accent-soft ${
          idle ? "opacity-55" : ""
        }`}
      >
        <span className="w-6 shrink-0 text-center text-sm text-muted">
          {idle ? "—" : row.rank_no}
        </span>

        <span className="w-10 shrink-0">
          <PortraitAvatar src={row.avatar_url} nickname={row.nickname} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {row.nickname}
          </span>
          {/* แคปชั่นมาก่อน ถ้าไม่มีค่อยบอกจำนวนครั้งแทน
              ไม่มีทั้งคู่ก็ไม่ต้องมีบรรทัดรองเลย */}
          {secondaryLine(row, idle) ? (
            <span className="block truncate text-xs text-muted">
              {secondaryLine(row, idle)}
            </span>
          ) : null}
        </span>

        <span className="shrink-0 text-right font-display text-sm font-semibold">
          {formatKm(row.total_km)}
          <span className="text-xs font-normal text-muted"> กม.</span>
        </span>
      </Link>
    </li>
  );
}

/** แถบสรุปท้ายกระดาน ใช้สีเข้มตรึงไว้ทั้งสองโหมด จะได้เด่นเหมือนกันเสมอ */
export function TotalBar({ totalKm }: { totalKm: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-club-ink px-5 py-4 text-club-cream">
      <span className="text-sm tracking-wide">รวมทั้งกลุ่ม</span>
      <span className="font-display text-xl font-semibold sm:text-2xl">
        {formatKm(totalKm)}
        <span className="ml-1 text-sm font-normal">กม.</span>
      </span>
    </div>
  );
}

/** ปุ่มลอยมุมขวาล่าง ติดหน้าจอตลอด เพราะเป็นปุ่มที่กดบ่อยที่สุด */
export function LogRunButton() {
  return (
    <Link
      href="/club/run/new"
      // เผื่อแถบ home indicator ของ iPhone ไม่ให้ปุ่มไปทับ
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      className="fixed right-5 z-30 flex min-h-14 items-center gap-2 rounded-full bg-club-line px-6 text-base font-medium tracking-wide text-background shadow-lg transition hover:opacity-90"
    >
      <span aria-hidden className="text-xl leading-none">
        +
      </span>
      กรอกผลวิ่ง
    </Link>
  );
}


// ---------------------------------------------------------------------------
//  กระดาน % ของเป้า
//  ใช้โครงการ์ดและคลาสเดียวกับกระดานระยะรวมทุกอย่าง ต่างแค่ตัวเลขที่แสดง
//  จะได้สลับไปมาแล้วไม่รู้สึกว่าเป็นคนละเว็บ
// ---------------------------------------------------------------------------

/** "ตั้งไว้ 50.00 เพื่อนปรับเป็น 53.00" โชว์เฉพาะตอนที่โหวตทำให้เป้าเปลี่ยน */
function adjustNote(row: PercentRow): string | null {
  if (!row.base_km || !row.final_km) return null;
  if (Number(row.base_km) === Number(row.final_km)) return null;
  return `ตั้งไว้ ${formatKm(row.base_km)} เพื่อนปรับเป็น ${formatKm(row.final_km)}`;
}

function PercentText({ row, first }: { row: PercentRow; first: boolean }) {
  const note = adjustNote(row);

  return (
    <>
      <p
        className={`truncate font-medium ${first ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}
      >
        {row.nickname}
      </p>
      <p
        className={`truncate font-display font-semibold text-accent-strong ${
          first ? "text-base sm:text-lg" : "text-sm"
        }`}
      >
        {formatPercent(row.percent)}
      </p>
      <p className="truncate text-[11px] text-muted">
        {formatKm(row.total_km)} / {row.final_km ? formatKm(row.final_km) : "—"}{" "}
        กม.
      </p>
      {note ? (
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted">
          {note}
        </p>
      ) : null}
      {row.caption ? (
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">
          {row.caption}
        </p>
      ) : null}
    </>
  );
}

export function PercentPodium({ top }: { top: PercentRow[] }) {
  return (
    <PodiumFrame
      slots={PODIUM_ORDER.map((index) => top[index] ?? null)}
      mug={(row) => (
        <div className={`${MUG_SCALE[row.rank_no] ?? "w-full"} relative`}>
          {row.rank_no === 1 ? <Spotlight /> : null}
          <BeerMug
            uid={row.member_id}
            src={row.avatar_url}
            nickname={row.nickname}
            rank={row.rank_no}
          />
        </div>
      )}
      text={(row, first) => <PercentText row={row} first={first} />}
    />
  );
}

export function PercentList({ rows }: { rows: PercentRow[] }) {
  if (rows.length === 0) return null;

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {rows.map((row) => {
        const note = adjustNote(row);
        // ยังไม่ได้ตั้งเป้า percent เป็น null จางลงเหมือนคนที่ยังไม่วิ่ง
        const idle = row.percent === null;

        return (
          <li key={row.member_id}>
            <Link
              href={`/club/member/${row.member_id}`}
              className={`flex min-h-16 items-center gap-3 px-3 py-2 transition-colors hover:bg-accent-soft ${
                idle ? "opacity-55" : ""
              }`}
            >
              <span className="w-6 shrink-0 text-center text-sm text-muted">
                {idle ? "—" : row.rank_no}
              </span>

              <span className="w-10 shrink-0">
                <PortraitAvatar src={row.avatar_url} nickname={row.nickname} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {row.nickname}
                </span>
                {row.caption ? (
                  <span className="block truncate text-xs text-muted">
                    {row.caption}
                  </span>
                ) : null}
                <span className="block truncate text-xs text-muted">
                  {idle ? "ยังไม่ได้ตั้งเป้า" : note}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-display text-sm font-semibold">
                  {formatPercent(row.percent)}
                </span>
                <span className="block text-xs text-muted">
                  {formatKm(row.total_km)} /{" "}
                  {row.final_km ? formatKm(row.final_km) : "—"} กม.
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
