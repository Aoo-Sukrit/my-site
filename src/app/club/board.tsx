import Link from "next/link";

import { PortraitAvatar } from "@/components/club/avatar";
import { formatKm } from "@/lib/date";
import type { LeaderboardRow } from "@/lib/supabase/types";

/** อันดับ 1 กลางและใหญ่กว่า ตามลำดับการวางแบบโพเดียมจริง 2 - 1 - 3 */
const PODIUM_ORDER = [1, 0, 2] as const;

function RankBadge({
  rank,
  highlight,
}: {
  rank: number;
  highlight?: boolean;
}) {
  return (
    <span
      className={`absolute -bottom-3 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full text-xs font-semibold ${
        highlight
          ? "bg-club-line text-background"
          : "border border-club-line bg-background text-club-line"
      }`}
    >
      {rank}
    </span>
  );
}

function PodiumSlot({ row, first }: { row: LeaderboardRow; first: boolean }) {
  return (
    <Link
      href={`/club/member/${row.member_id}`}
      className="block text-center transition-opacity hover:opacity-90"
    >
      <div className="relative">
        <PortraitAvatar
          src={row.avatar_url}
          nickname={row.nickname}
          className={first ? "ring-2 ring-club-line" : ""}
        />
        <RankBadge rank={row.rank_no} highlight={first} />
      </div>

      <p
        className={`mt-5 truncate font-medium ${first ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}
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
    </Link>
  );
}

/**
 * โพเดียม 3 อันดับแรก
 *
 * คอลัมน์กลางกว้างกว่าอีกสองข้างเพื่อให้อันดับ 1 เด่น และใช้ grid สามคอลัมน์
 * ตายตัว ไม่ใช่ flex-wrap เพราะต้องอยู่แถวเดียวกันบนมือถือเสมอ ห้ามตกบรรทัด
 * items-end ทำให้ฐานของทั้งสามชิดกัน ได้ความรู้สึกเป็นแท่นโพเดียม
 */
export function Podium({ top }: { top: LeaderboardRow[] }) {
  return (
    <ul className="grid grid-cols-[1fr_1.3fr_1fr] items-end gap-2 sm:gap-4">
      {PODIUM_ORDER.map((index) => {
        const row = top[index];
        if (!row) return <li key={index} aria-hidden />;
        return (
          <li key={row.member_id}>
            <PodiumSlot row={row} first={index === 0} />
          </li>
        );
      })}
    </ul>
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
          <span className="block text-xs text-muted">
            {idle ? "ยังไม่ได้กรอก" : `${row.run_count} ครั้ง`}
          </span>
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
