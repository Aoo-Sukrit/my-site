import { ImageResponse } from "next/og";

import { getViewer } from "@/lib/auth";
import { thaiMonthLabel } from "@/lib/date";
import { monthRange } from "@/lib/run-rules";
import { getCurrentRound, getLeaderboard, signAvatarUrls } from "@/lib/runs";

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
  type StoryEntry,
} from "../story-card";

/**
 * วาดรูปกระดานสำหรับลงสตอรี่ ขนาด 1080 x 1920
 *
 * วาดฝั่งเซิร์ฟเวอร์ด้วย next/og (satori + resvg) ไม่ใช่จับภาพฝั่งเบราว์เซอร์
 * เพราะฝั่งเบราว์เซอร์จะติด CORS ตอนอ่านรูปคนลงใน canvas แล้วรูปหายหมด
 *
 * ดึงข้อมูลสดทุกครั้ง ไม่ cache เพราะกระดานเปลี่ยนตลอดเวลา
 */
export async function GET() {
  const viewer = await getViewer();

  // proxy กันชั้นหนึ่งแล้ว แต่ route handler ถูกยิงตรงได้ จึงเช็กซ้ำเอง
  // และคืน 403 แทนการ redirect เพราะปลายทางนี้คือรูป ไม่ใช่หน้าเว็บ
  if (!viewer || viewer.profile.status !== "approved") {
    return new Response("เฉพาะสมาชิกที่อนุมัติแล้ว", { status: 403 });
  }

  const [round, board, fonts, logo] = await Promise.all([
    getCurrentRound(),
    getLeaderboard(),
    loadFonts(),
    loadLogoDataUri(),
  ]);

  const ranked = board.filter((row) => Number(row.total_km) > 0);
  const idle = board.filter((row) => Number(row.total_km) <= 0);
  const totalKm = ranked.reduce((sum, row) => sum + Number(row.total_km), 0);

  const ordered = [...ranked, ...idle];

  // ขอลิงก์ที่มีลายเซ็นทีเดียวทั้งชุด แล้วค่อยดึงรูปมาฝังเป็น data URI
  // ถ้าลิงก์ที่เซ็นใช้ไม่ได้ ค่อยถอยไปลองลิงก์ตรงที่เก็บไว้ในตาราง
  // คนไหนได้ null สุดท้ายก็ไปแสดงเป็นตัวอักษรแรกแทน ไม่ทำให้ทั้งรูปพัง
  const avatarPaths = ordered.map((row) => avatarObjectPath(row.avatar_url));
  const signedAvatars = await signAvatarUrls(
    avatarPaths.filter((path): path is string => path !== null),
  );

  const avatars = await Promise.all(
    ordered.map(async (row, index) => {
      const path = avatarPaths[index];
      const signed = path ? signedAvatars.get(path) : null;

      return (
        (await fetchImageDataUri(signed ?? null)) ??
        (await fetchImageDataUri(row.avatar_url))
      );
    }),
  );

  const entries: StoryEntry[] = ordered.map((row, index) => ({
    memberId: row.member_id,
    nickname: row.nickname,
    caption: row.caption,
    avatar: avatars[index],
    totalKm: row.total_km,
    runCount: row.run_count,
    rankNo: row.rank_no,
    idle: Number(row.total_km) <= 0,
  }));

  const podium = entries.filter((entry) => !entry.idle).slice(0, 3);
  const rows = entries.filter((entry) => !entry.idle).slice(3);
  const idleRows = entries.filter((entry) => entry.idle);

  const periodLabel = round
    ? `1–${Number(monthRange(round.month.slice(0, 7)).max.slice(8, 10))} ${thaiMonthLabel(round.month)}`
    : "ยังไม่มีรอบของเดือนนี้";

  return new ImageResponse(
    (
      <StoryCard
        logo={logo}
        periodLabel={periodLabel}
        memberCount={board.length}
        podium={podium}
        rows={[...rows, ...idleRows]}
        totalKm={totalKm}
      />
    ),
    {
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
      fonts,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
