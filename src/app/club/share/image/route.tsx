import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { getViewer } from "@/lib/auth";
import { thaiMonthLabel } from "@/lib/date";
import { monthRange } from "@/lib/run-rules";
import { getCurrentRound, getLeaderboard, signAvatarUrls } from "@/lib/runs";
import { roundPhase } from "@/lib/target-rules";
import { getPercentBoard } from "@/lib/targets";

import {
  avatarObjectPath,
  fetchImageDataUri,
  loadFonts,
  loadLogoDataUri,
} from "../assets";
import {
  STORY_HEIGHT,
  STORY_WIDTH,
  StoryCard,
  type PodiumStyle,
  type StoryEntry,
  type StoryMode,
} from "../story-card";

/** แถวกลางที่ทั้งสองกระดานแปลงมาเป็นชนิดเดียวกัน ก่อนส่งให้การ์ดวาด */
type SourceRow = {
  member_id: string;
  nickname: string;
  caption: string | null;
  avatar_url: string | null;
  total_km: string;
  run_count: number;
  rank_no: number;
  idle: boolean;
  percent: string | null;
  final_km: string | null;
};

/**
 * วาดรูปกระดานสำหรับลงสตอรี่ ขนาด 1080 x 1920
 *
 * วาดฝั่งเซิร์ฟเวอร์ด้วย next/og (satori + resvg) ไม่ใช่จับภาพฝั่งเบราว์เซอร์
 * เพราะฝั่งเบราว์เซอร์จะติด CORS ตอนอ่านรูปคนลงใน canvas แล้วรูปหายหมด
 *
 * ?board=percent สลับเป็นกระดาน % ของเป้า ใช้ดีไซน์เดียวกันทุกอย่าง
 * ดึงข้อมูลสดทุกครั้ง ไม่ cache เพราะกระดานเปลี่ยนตลอดเวลา
 */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();

  // proxy กันชั้นหนึ่งแล้ว แต่ route handler ถูกยิงตรงได้ จึงเช็กซ้ำเอง
  // และคืน 403 แทนการ redirect เพราะปลายทางนี้คือรูป ไม่ใช่หน้าเว็บ
  if (!viewer || viewer.profile.status !== "approved") {
    return new Response("เฉพาะสมาชิกที่อนุมัติแล้ว", { status: 403 });
  }

  const mode: StoryMode =
    request.nextUrl.searchParams.get("board") === "percent"
      ? "percent"
      : "distance";

  const round = await getCurrentRound();

  // ด่านที่สองของการปิดตา ฝั่งฐานข้อมูลคืน 0 แถวอยู่แล้วก่อนถึงเวลาเปิดผล
  // แต่ปฏิเสธตั้งแต่ตรงนี้ด้วย จะได้ไม่มีทางหลุดข้อมูลเป้าออกไปก่อนเวลา
  if (mode === "percent") {
    if (!round) {
      return new Response("ยังไม่มีรอบของเดือนนี้", { status: 409 });
    }
    if (
      roundPhase(round.target_opens_at, round.target_locks_at) !== "revealed"
    ) {
      return new Response("ยังไม่ถึงเวลาเปิดผลเป้า", { status: 409 });
    }
  }

  const [fonts, logo] = await Promise.all([loadFonts(), loadLogoDataUri()]);

  let sourceRows: SourceRow[];

  if (mode === "distance") {
    const board = await getLeaderboard();
    const ranked = board.filter((row) => Number(row.total_km) > 0);
    const resting = board.filter((row) => Number(row.total_km) <= 0);

    sourceRows = [...ranked, ...resting].map((row) => ({
      member_id: row.member_id,
      nickname: row.nickname,
      caption: row.caption,
      avatar_url: row.avatar_url,
      total_km: row.total_km,
      run_count: row.run_count,
      rank_no: row.rank_no,
      idle: Number(row.total_km) <= 0,
      percent: null,
      final_km: null,
    }));
  } else {
    // month_percent_board() เรียงมาให้แล้ว มากไปน้อย คนไม่มีเป้าอยู่ท้าย
    const rows = await getPercentBoard();

    sourceRows = rows.map((row) => ({
      member_id: row.member_id,
      nickname: row.nickname,
      caption: row.caption,
      avatar_url: row.avatar_url,
      total_km: row.total_km,
      run_count: 0,
      rank_no: row.rank_no,
      idle: row.percent === null,
      percent: row.percent,
      final_km: row.final_km,
    }));
  }

  // ขอลิงก์ที่มีลายเซ็นทีเดียวทั้งชุด แล้วค่อยดึงรูปมาฝังเป็น data URI
  // ถ้าลิงก์ที่เซ็นใช้ไม่ได้ ค่อยถอยไปลองลิงก์ตรงที่เก็บไว้ในตาราง
  // คนไหนได้ null สุดท้ายก็ไปแสดงเป็นตัวอักษรแรกแทน ไม่ทำให้ทั้งรูปพัง
  const avatarPaths = sourceRows.map((row) => avatarObjectPath(row.avatar_url));
  const signedAvatars = await signAvatarUrls(
    avatarPaths.filter((path): path is string => path !== null),
  );

  const avatars = await Promise.all(
    sourceRows.map(async (row, index) => {
      const path = avatarPaths[index];
      const signed = path ? signedAvatars.get(path) : null;

      return (
        (await fetchImageDataUri(signed ?? null)) ??
        (await fetchImageDataUri(row.avatar_url))
      );
    }),
  );

  const entries: StoryEntry[] = sourceRows.map((row, index) => ({
    memberId: row.member_id,
    nickname: row.nickname,
    caption: row.caption,
    avatar: avatars[index],
    totalKm: row.total_km,
    runCount: row.run_count,
    rankNo: row.rank_no,
    idle: row.idle,
    percent: row.percent,
    finalKm: row.final_km,
  }));

  const active = entries.filter((entry) => !entry.idle);
  const resting = entries.filter((entry) => entry.idle);

  // โหมดระยะรวมบอกผลรวมกลุ่ม โหมด % บอกค่าเฉลี่ย เพราะผลรวมของ % ไม่มีความหมาย
  const summary =
    mode === "distance"
      ? active.reduce((sum, entry) => sum + Number(entry.totalKm), 0)
      : active.reduce((sum, entry) => sum + Number(entry.percent ?? 0), 0) /
        Math.max(active.length, 1);

  const periodLabel = round
    ? `1–${Number(monthRange(round.month.slice(0, 7)).max.slice(8, 10))} ${thaiMonthLabel(round.month)}`
    : "ยังไม่มีรอบของเดือนนี้";

  /**
   * วาดให้เสร็จทั้งรูปตรงนี้เลย ไม่ปล่อยให้สตรีมออกไปแล้วค่อยพังกลางทาง
   *
   * ImageResponse คืน Response ที่ body เป็นสตรีม การวาดจริงเกิดตอนมีคนอ่าน
   * สตรีมนั้น ซึ่งอยู่นอก try/catch ของเรา ถ้าพังตรงนั้นจะได้แค่
   * FUNCTION_INVOCATION_FAILED เปล่าๆ ใน log โดยไม่รู้ว่าอะไรพัง
   * เรียก arrayBuffer() ก่อน ทำให้ error เด้งขึ้นมาให้จับและเขียน log ได้
   */
  async function draw(podiumStyle: PodiumStyle) {
    const image = new ImageResponse(
      (
        <StoryCard
          mode={mode}
          logo={logo}
          periodLabel={periodLabel}
          memberCount={entries.length}
          podium={active.slice(0, 3)}
          rows={[...active.slice(3), ...resting]}
          totalKm={summary}
          totalLabel={mode === "percent" ? "เฉลี่ยทั้งกลุ่ม" : "รวมทั้งกลุ่ม"}
          podiumStyle={podiumStyle}
        />
      ),
      { width: STORY_WIDTH, height: STORY_HEIGHT, fonts },
    );

    return image.arrayBuffer();
  }

  /** รายละเอียดเท่าที่ช่วยไล่ปัญหาได้ โดยไม่หลุดข้อมูลส่วนตัวของสมาชิก */
  function describe(error: unknown, podiumStyle: PodiumStyle) {
    return {
      podiumStyle,
      mode,
      memberCount: entries.length,
      withAvatar: entries.filter((entry) => entry.avatar !== null).length,
      avatarBytes: entries.reduce(
        (sum, entry) => sum + (entry.avatar?.length ?? 0),
        0,
      ),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  }

  function send(png: ArrayBuffer) {
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  try {
    return send(await draw("mug"));
  } catch (error) {
    // แก้วพังแล้ว ลองใหม่ด้วยโพเดียมรูปสี่เหลี่ยมแบบเดิม ซึ่งไม่แตะ svg เลย
    // ได้รูปที่หน้าตาไม่ตรงใจดีกว่าได้ 500
    console.error("[share/image] วาดแบบแก้วไม่สำเร็จ", describe(error, "mug"));

    try {
      return send(await draw("square"));
    } catch (fallbackError) {
      console.error(
        "[share/image] วาดแบบสี่เหลี่ยมก็ไม่สำเร็จ",
        describe(fallbackError, "square"),
      );

      return new Response("วาดรูปไม่สำเร็จ ลองใหม่อีกครั้ง", {
        status: 500,
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }
  }
}
