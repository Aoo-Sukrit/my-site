import type { Metadata } from "next";
import Link from "next/link";

import Alert from "@/components/club/alert";
import ClubLogo from "@/components/club-logo";
import LinkPending from "@/components/link-pending";
import { requireApproved } from "@/lib/auth";
import {
  getRoundChallenges,
  getRoundDeadlines,
  pendingForMe,
} from "@/lib/challenges";
import {
  bangkokToday,
  hasPassed,
  thaiDateTimeLong,
  thaiMonthLabel,
  withinDaysAfter,
} from "@/lib/date";
import { monthKeyOf, monthRange, previousMonthKey } from "@/lib/run-rules";
import {
  getCurrentRound,
  getLeaderboard,
  getRoundByMonth,
  getRoundMonths,
} from "@/lib/runs";
import { getRoundPrizes } from "@/lib/prizes";
import { roundPhase } from "@/lib/target-rules";
import { getPercentBoard } from "@/lib/targets";

import ChallengeBoard from "./challenge-board";
import DismissibleBanner from "./dismissible-banner";
import LogRunButton from "./log-run-button";
import MonthPicker from "./month-picker";
import RewardsTab from "./rewards";
import {
  PercentList,
  PercentPodium,
  Podium,
  RankList,
  TotalBar,
} from "./board";

export const metadata: Metadata = {
  title: "BEER NOW RUN LATER",
};

/** แถบ "ผลเดือนที่แล้วออกแล้ว" อยู่กี่วันหลังเวลาตัดสินของเดือนนั้น */
const LAST_MONTH_BANNER_DAYS = 3;

/**
 * แถบประกาศเตี้ยๆ บนหน้ากระดาน กดทั้งแถบเพื่อไปหน้านั้น
 *   loud   พื้นครีมขอบเข้ม ใช้กับเรื่องที่ต้องลงมือ (มีคนท้า ตั้งเป้า)
 *   plain  พื้นขาวขอบบาง ใช้กับเรื่องที่แค่แจ้งให้รู้
 * closable เว้นที่ด้านขวาให้ปุ่ม × ของ DismissibleBanner แทนลูกศร
 */
function Notice({
  href,
  tone,
  title,
  detail,
  closable = false,
}: {
  href: string;
  tone: "loud" | "plain";
  title: string;
  detail: string;
  closable?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl py-2.5 pl-4 transition active:scale-[0.99] ${
        closable ? "pr-14" : "pr-4"
      } ${
        tone === "loud"
          ? "border-2 border-club-line bg-club-cream text-club-ink hover:opacity-90"
          : "border border-border bg-surface hover:border-accent"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate font-display text-[15px] leading-snug font-semibold">
          {title}
        </span>
        <span
          className={`block truncate text-xs ${tone === "loud" ? "" : "text-muted"}`}
        >
          {detail}
        </span>
      </span>
      {closable ? null : (
        <span aria-hidden className="shrink-0 text-lg">
          →
        </span>
      )}
    </Link>
  );
}

/** "1–31 ตุลาคม 2569" */
function periodLabel(month: string) {
  const lastDay = Number(monthRange(month.slice(0, 7)).max.slice(8, 10));
  return `1–${lastDay} ${thaiMonthLabel(month)}`;
}

/**
 * สรุปเดือนที่แล้วไว้ทำแถบชวนไปดู
 *
 * ถ้าเดือนนั้นไม่มีทั้งรางวัลและคำท้า ก็ไม่ต้องมีแถบ เพราะกดไปแล้วเจอแต่กระดาน
 * เปล่าๆ ซึ่งคนดูได้จากตัวเลือกเดือนอยู่แล้ว
 */
async function lastMonthSummary(monthKey: string) {
  const [prizes, challenges, deadlines] = await Promise.all([
    getRoundPrizes(monthKey),
    getRoundChallenges(monthKey),
    getRoundDeadlines(monthKey),
  ]);

  if (prizes.length === 0 && challenges.length === 0) return null;
  if (!deadlines) return null;

  return {
    monthKey,
    settleAt: deadlines.settle_at,
    settled: hasPassed(deadlines.settle_at),
  };
}

export default async function ClubPage(props: PageProps<"/club">) {
  // ยังต้องเรียกเพื่อกันคนที่ยังไม่ได้รับอนุมัติ ถึงจะไม่ได้ใช้ค่าที่คืนมาแล้ว
  // หลังย้ายเมนูท้ายหน้าขึ้นไปอยู่แถบบน
  await requireApproved();
  const params = await props.searchParams;

  const boardTab =
    params.board === "percent" ||
    params.board === "rewards" ||
    params.board === "challenges"
      ? params.board
      : "distance";
  const showPercent = boardTab === "percent";

  // เลือกเดือน ใส่ month มั่วๆ ให้กลับมาเดือนปัจจุบันเงียบๆ ไม่ต้องขึ้น error
  // เพราะลิงก์เก่าที่เพื่อนส่งต่อกันในกลุ่มอาจชี้ไปเดือนที่ยังไม่มีรอบ
  const months = await getRoundMonths();
  const currentMonthKey =
    months.find((row) => row.is_current)?.month.slice(0, 7) ??
    monthKeyOf(bangkokToday());

  const asked = typeof params.month === "string" ? params.month : null;
  const selectedMonth =
    asked && months.some((row) => row.month.slice(0, 7) === asked)
      ? asked
      : currentMonthKey;
  const isCurrentMonth = selectedMonth === currentMonthKey;

  // เดือนที่ผ่านไปแล้วอ่านอย่างเดียว ฐานข้อมูลกันไว้อยู่แล้วทุกทาง
  // แต่ไม่ควรโชว์ปุ่มที่กดแล้วขึ้น error
  const readOnly = !isCurrentMonth;
  const monthArg = isCurrentMonth ? undefined : selectedMonth;

  // แถบชวนไปดูผลของเดือนที่แล้ว ขึ้นเฉพาะตอนดูเดือนปัจจุบัน
  // และเฉพาะเดือนที่มีรางวัลหรือคำท้าอยู่จริง ไม่งั้นกดไปก็เจอหน้าว่าง
  const lastMonthKey = previousMonthKey(currentMonthKey);
  const lastMonthRow = months.find(
    (row) => row.month.slice(0, 7) === lastMonthKey,
  );
  // แถบประกาศผลเดือนก่อนอยู่แค่ LAST_MONTH_BANNER_DAYS วันหลังเวลาตัดสิน
  // (results_at) แล้วหายไปเอง ไม่ต้องค้างทั้งเดือนจนคนเลิกอ่าน
  // ช่วงก่อนตัดสิน (ปกติแค่ครึ่งวันแรกของเดือน) ยังขึ้นเป็น "รอผลวิ่งย้อนหลัง"
  const lastMonthExists =
    lastMonthRow !== undefined &&
    withinDaysAfter(lastMonthRow.results_at, LAST_MONTH_BANNER_DAYS);

  // สี่อย่างนี้ไม่ต้องรอกัน ยิงพร้อมกันทีเดียว ของเดิมรอทีละตัวจนหน้าแรก
  // ช้าเท่าผลรวมของทุกคำถาม ตอนนี้ช้าเท่าตัวที่ช้าที่สุดตัวเดียว
  //
  // คำท้ายิงไปก่อนเลยถ้าดูเดือนปัจจุบัน แล้วค่อยทิ้งข้างล่างถ้าไม่มีรอบ
  // getRoundChallenges() ไม่ throw อยู่แล้ว ถ้าฐานข้อมูลตอบ error ก็คืนแถวว่าง
  const [round, board, roundChallenges, lastMonth] = await Promise.all([
    isCurrentMonth ? getCurrentRound() : getRoundByMonth(selectedMonth),
    getLeaderboard(monthArg),
    isCurrentMonth ? getRoundChallenges() : Promise.resolve([]),
    isCurrentMonth && lastMonthExists
      ? lastMonthSummary(lastMonthKey)
      : Promise.resolve(null),
  ]);
  const phase = round
    ? roundPhase(round.target_opens_at, round.target_locks_at)
    : "before";

  // เรียกเฉพาะตอนดูกระดาน % จะได้ไม่ยิง RPC ทิ้งทุกครั้งที่เปิดหน้าแรก
  const percentRows =
    showPercent && phase === "revealed" ? await getPercentBoard(monthArg) : [];

  // คำท้าที่รอเรากดรับ ต้องเด้งให้เห็นตั้งแต่หน้าแรก ไม่ใช่ซ่อนอยู่ในแท็บรางวัล
  // เพราะถ้าไม่มีใครกดจนเลยวันปิดรับ คำท้าจะตกไปเฉยๆ โดยไม่มีใครรู้ตัว
  const myPendingChallenges =
    round && isCurrentMonth ? pendingForMe(roundChallenges) : [];

  // แถบตั้งเป้า/เปิดผลเป้า มีของเดือนปัจจุบันตลอดทั้งเดือน
  const showTargetNotice =
    round !== null &&
    isCurrentMonth &&
    (phase === "open" || phase === "revealed");

  /** ลิงก์แท็บที่พาเดือนที่เลือกไปด้วย เดือนปัจจุบันไม่ต้องใส่ month */
  const tabHref = (tab: "percent" | "rewards" | "challenges" | null) => {
    const parts: string[] = [];
    if (!isCurrentMonth) parts.push(`month=${selectedMonth}`);
    if (tab) parts.push(`board=${tab}`);
    return parts.length > 0 ? `/club?${parts.join("&")}` : "/club";
  };

  const ranked = board.filter((row) => Number(row.total_km) > 0);
  const idle = board.filter((row) => Number(row.total_km) <= 0);
  const groupTotal = ranked.reduce((sum, row) => sum + Number(row.total_km), 0);

  return (
    // pb เผื่อที่ให้ปุ่มลอย (สูง 56 + ห่างขอบ 20 + แถบ home ของ iPhone)
    // ไม่ให้ไปบังแถวสุดท้ายของรายการกับแถบรวมทั้งกลุ่ม
    <div className="space-y-6 pb-36">
      {params.saved ? <Alert tone="success">บันทึกผลวิ่งแล้ว</Alert> : null}
      {typeof params.err === "string" ? (
        <Alert tone="error">{params.err}</Alert>
      ) : null}
      {typeof params.msg === "string" ? (
        <Alert tone="success">{params.msg}</Alert>
      ) : null}

      {/* ส่วนหัวแบบแถวเดียว: โลโก้เล็กชิดซ้าย ชื่อกับช่วงเดือนอยู่ขวา
          ของเดิมวางโลโก้ใหญ่กลางจอทีละบรรทัด บวกแถบประกาศตัวโต
          จนบนจอ 375×812 ต้องเลื่อนลงก่อนถึงจะเห็นแก้วเบียร์บนโพเดียม */}
      <header className="flex items-center gap-3">
        <ClubLogo className="w-14 shrink-0 rounded-xl" sizes="56px" eager />
        <div className="min-w-0">
          <h1 className="font-display text-lg leading-tight font-semibold tracking-tight sm:text-xl">
            BEER NOW RUN LATER
          </h1>
          <p className="text-xs text-muted sm:text-sm">
            {round ? periodLabel(round.month) : "ยังไม่มีรอบของเดือนนี้"} ·{" "}
            {board.length} คน
          </p>
        </div>
      </header>

      {/* แถบประกาศทั้งหมดอยู่ก้อนเดียว ชิดกันกว่าระยะห่างของส่วนอื่น
          และเตี้ยลงเหลือบรรทัดหัวข้อกับบรรทัดรองตัวเล็ก */}
      {lastMonth || myPendingChallenges.length > 0 || showTargetNotice ? (
        <div className="space-y-2">
          {lastMonth ? (
            <DismissibleBanner
              storageKey={`club:last-month-banner:${lastMonth.monthKey}`}
              label="ปิดแถบนี้"
            >
              <Notice
                href={`/club?month=${lastMonth.monthKey}&board=rewards`}
                tone="plain"
                title={
                  lastMonth.settled
                    ? `ผลเดือน${thaiMonthLabel(`${lastMonth.monthKey}-01`)}ออกแล้ว`
                    : `เดือน${thaiMonthLabel(`${lastMonth.monthKey}-01`)}ยังรอผลวิ่งย้อนหลัง`
                }
                detail={
                  lastMonth.settled
                    ? "ดูใครได้อะไร"
                    : `ตัดสิน ${thaiDateTimeLong(lastMonth.settleAt)}`
                }
                // เว้นที่ขวาไว้ให้ปุ่ม × ไม่มีลูกศร
                closable
              />
            </DismissibleBanner>
          ) : null}

          {myPendingChallenges.length > 0 ? (
            <Notice
              href="/club?board=challenges"
              tone="loud"
              title={`มีคนท้าคุณ ${myPendingChallenges.length} คำท้า`}
              detail="รอคุณกดรับ"
            />
          ) : null}

          {round && isCurrentMonth && phase === "open" ? (
            <Notice
              href="/club/target"
              tone="loud"
              title="ตั้งเป้าเดือนนี้ได้แล้ว"
              detail={`ปิดรับ ${thaiDateTimeLong(round.target_locks_at)}`}
            />
          ) : null}

          {/* พอเปิดผลแล้วแถบตั้งเป้าหายไป ทำให้ไม่มีทางไปดูผลจากหน้านี้เลย
              แถบนี้มาแทน อยู่จนหมดเดือน เพราะ round คือรอบของเดือนปัจจุบัน */}
          {round && isCurrentMonth && phase === "revealed" ? (
            <Notice
              href="/club?board=rewards"
              tone="loud"
              title="เปิดผลเป้าแล้ว"
              detail="ดูว่าใครปรับเป้าใคร"
            />
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        <MonthPicker
          months={months}
          selected={selectedMonth}
          currentMonthKey={currentMonthKey}
          board={boardTab === "distance" ? null : boardTab}
        />

        {/* สลับกระดานด้วย query string ไม่ต้องใช้ JS ฝั่งเบราว์เซอร์เลย */}
        <nav className="flex gap-1 rounded-full border border-border p-1">
          <BoardTab href={tabHref(null)} active={boardTab === "distance"}>
            ระยะรวม
          </BoardTab>
          <BoardTab href={tabHref("percent")} active={boardTab === "percent"}>
            % ของเป้า
          </BoardTab>
          <BoardTab href={tabHref("rewards")} active={boardTab === "rewards"}>
            รางวัล
          </BoardTab>
          {/* แยกคำท้าออกมาจากแท็บรางวัลเป็นแท็บของตัวเอง ชื่อเต็มที่อยากได้คือ
              "อยากเลี้ยงเบียร์เพื่อน" แต่ยาวเกินช่องบนจอ 375px ใช้ "คำท้า" ไปก่อน */}
          <BoardTab
            href={tabHref("challenges")}
            active={boardTab === "challenges"}
          >
            คำท้า
          </BoardTab>
        </nav>
      </div>

      {boardTab === "rewards" || boardTab === "challenges" ? (
        round ? (
          boardTab === "rewards" ? (
            <RewardsTab round={round} monthKey={monthArg} readOnly={readOnly} />
          ) : (
            <ChallengeBoard
              round={round}
              monthKey={monthArg}
              readOnly={readOnly}
            />
          )
        ) : (
          <p className="text-sm text-muted">ยังไม่มีรอบของเดือนนี้</p>
        )
      ) : showPercent ? (
        phase !== "revealed" && round ? (
          <section className="rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-10 text-center">
            <p className="font-display text-lg font-medium">เป้ายังไม่เปิด</p>
            <p className="mt-2 text-sm text-muted">
              รอ {thaiDateTimeLong(round.target_locks_at)}
            </p>
          </section>
        ) : percentRows.length === 0 ? (
          <p className="text-sm text-muted">รอบนี้ยังไม่มีใครตั้งเป้าไว้</p>
        ) : (
          <>
            <PercentPodium top={percentRows.slice(0, 3)} />
            <PercentList rows={percentRows.slice(3)} />
          </>
        )
      ) : (
        <>
          {ranked.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-club-line bg-accent-soft px-5 py-10 text-center">
              <p className="font-display text-lg font-medium">
                ยังไม่มีใครกรอกผลเลย
              </p>
              <p className="mt-1 text-sm text-muted">เป็นคนแรกสิ</p>
            </section>
          ) : (
            <section>
              <Podium top={ranked.slice(0, 3)} />
            </section>
          )}

          <RankList ranked={ranked.slice(3)} idle={idle} />

          <TotalBar totalKm={groupTotal} />
        </>
      )}

      <p className="text-center text-[11px] tracking-[0.2em] text-muted sm:text-xs">
        GOOD PACE · GOOD PLACE · GOOD PEOPLE
      </p>

      {isCurrentMonth ? <LogRunButton /> : null}
    </div>
  );
}

function BoardTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-sm tracking-wide transition active:scale-[0.97] ${
        active
          ? "bg-club-line font-medium text-background"
          : "text-muted hover:text-foreground has-[[data-pending]]:animate-pulse has-[[data-pending]]:bg-accent-soft has-[[data-pending]]:text-foreground"
      }`}
    >
      {children}
      <LinkPending />
    </Link>
  );
}
