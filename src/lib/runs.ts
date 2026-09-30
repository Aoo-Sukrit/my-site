import { createSupabaseServerClient } from "./supabase/server";
import type {
  LeaderboardRow,
  Round,
  RoundMonth,
  Run,
  RunEdit,
} from "./supabase/types";

export const PROOF_BUCKET = "proofs";
export const AVATAR_BUCKET = "avatars";
export const EDIT_WINDOW_HOURS = 24;

/**
 * รอบของเดือนปัจจุบัน ถ้ายังไม่มีฐานข้อมูลจะสร้างให้เอง
 *
 * เรียกผ่าน RPC ไม่ใช่ select ตรงๆ เพราะฟังก์ชันฝั่งฐานข้อมูลเป็นตัวตัดสิน
 * ว่า "เดือนนี้" คือเดือนอะไร โดยคิดตามเวลาไทย ถ้าฝั่งเว็บคำนวณเองจะมีโอกาส
 * เห็นไม่ตรงกันช่วงเปลี่ยนเดือน
 */
export async function getCurrentRound(): Promise<Round | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("current_round");
  return (data as Round | null) ?? null;
}

/**
 * รอบของเดือนที่ระบุ แบบอ่านอย่างเดียว
 * ต่างจาก getRoundForDate() ตรงที่ไม่สร้างรอบใหม่ให้ถ้ายังไม่มี
 */
export async function getRoundByMonth(
  monthKey: string,
): Promise<Round | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("round_by_month", {
    target_month: `${monthKey}-01`,
  });
  return (data as Round | null) ?? null;
}

/** เดือนที่เลือกดูได้ ใหม่ไปเก่า ไม่เลยเดือนปัจจุบัน */
export async function getRoundMonths(): Promise<RoundMonth[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("round_months");
  return (data ?? []) as RoundMonth[];
}

/** รอบที่ผลวิ่งรายการหนึ่งสังกัดอยู่ ใช้ดูเวลาตัดสินตอนจะแก้ */
export async function getRoundById(roundId: string): Promise<Round | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .maybeSingle<Round>();
  return data ?? null;
}

/**
 * รอบของเดือนที่วันนั้นอยู่ สร้างให้ถ้ายังไม่มี
 *
 * ใช้ตอนกรอกผลวิ่ง เพราะผลวิ่งต้องไปเข้ารอบของเดือนที่วิ่งจริง ไม่ใช่รอบ
 * ของเดือนปัจจุบัน คนที่วิ่งเย็นวันสิ้นเดือนแล้วมากรอกวันที่ 1 จึงยังนับถูกรอบ
 */
export async function getRoundForDate(isoDate: string): Promise<Round | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("round_for_date", { target: isoDate });
  return (data as Round | null) ?? null;
}

export async function getLeaderboard(
  monthKey?: string,
): Promise<LeaderboardRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("month_leaderboard", {
    target_month: monthKey ? `${monthKey}-01` : null,
  });
  return (data ?? []) as LeaderboardRow[];
}

export async function getMemberRuns(
  memberId: string,
  roundId: string,
): Promise<Run[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("runs")
    .select("*")
    .eq("profile_id", memberId)
    .eq("round_id", roundId)
    .order("ran_on", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<Run[]>();

  return data ?? [];
}

export async function getMemberEdits(memberId: string): Promise<RunEdit[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("run_edits")
    .select("*")
    .eq("profile_id", memberId)
    .order("edited_at", { ascending: false })
    .limit(50)
    .returns<RunEdit[]>();

  return data ?? [];
}

/**
 * ขอลิงก์ชั่วคราวสำหรับรูปหลักฐาน
 *
 * บัคเก็ต proofs เป็นแบบส่วนตัว จะเอา URL ไปแปะตรงๆ ไม่ได้ ต้องขอลิงก์
 * ที่มีลายเซ็นและวันหมดอายุทุกครั้งที่เรนเดอร์ ตั้งไว้ 1 ชั่วโมงพอ
 */
export async function signProofUrls(
  paths: string[],
): Promise<Map<string, string>> {
  return signStorageUrls(PROOF_BUCKET, paths);
}

/**
 * ลิงก์ชั่วคราวของรูปโปรไฟล์
 *
 * บัคเก็ต avatars ตั้งเป็น public ไว้ ลิงก์ตรงๆ จึงเปิดได้อยู่แล้วและปกติ
 * ไม่ต้องเซ็น แต่รูปสตอรี่ขอผ่านทางนี้ก่อน เพื่อให้ยังทำงานได้ถ้าวันหนึ่ง
 * เปลี่ยนบัคเก็ตเป็นส่วนตัว โดยไม่ต้องกลับมาแก้โค้ดตรงนั้นอีก
 */
export async function signAvatarUrls(
  paths: string[],
): Promise<Map<string, string>> {
  return signStorageUrls(AVATAR_BUCKET, paths);
}

async function signStorageUrls(
  bucket: string,
  paths: string[],
): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return signed;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrls(unique, 60 * 60);

  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
  }

  return signed;
}

/**
 * ยังอยู่ในช่วง 24 ชั่วโมงที่แก้เองได้ไหม
 *
 * ใช้ตัดสินแค่ว่าจะโชว์ปุ่มแก้กับลบหรือเปล่า ตัวบังคับจริงคือ trigger
 * runs_enforce_edit_window ในฐานข้อมูล ตรงนี้พังก็ไม่ได้ทำให้กติกาหลุด
 */
/**
 * ยังแก้หรือลบผลวิ่งรายการนี้เองได้ไหม
 *
 * ใช้เวลาที่มาถึงก่อน ระหว่าง 24 ชั่วโมงหลังกรอก กับเวลาตัดสินของรอบนั้น
 * เดิมใช้ 24 ชั่วโมงอย่างเดียว ซึ่งมีช่องโหว่ คนกรอกสามทุ่มวันที่ 31
 * ยังแก้ได้ถึงสามทุ่มวันที่ 1 คือหลังเวลาตัดสินไปแล้วเก้าชั่วโมง
 *
 * ตัวบังคับจริงคือ trigger runs_enforce_edit_window ในฐานข้อมูล
 * แอดมินไม่ติดกติกานี้ ทั้งสองฝั่ง
 */
export function editDeadline(run: Run, resultsAt: string | null): number {
  const twentyFour =
    new Date(run.created_at).getTime() + EDIT_WINDOW_HOURS * 60 * 60 * 1000;
  if (!resultsAt) return twentyFour;
  return Math.min(twentyFour, new Date(resultsAt).getTime());
}

export function withinEditWindow(run: Run, resultsAt: string | null): boolean {
  return Date.now() < editDeadline(run, resultsAt);
}

export function hoursLeftToEdit(run: Run, resultsAt: string | null): number {
  const msLeft = editDeadline(run, resultsAt) - Date.now();
  return Math.max(0, Math.ceil(msLeft / (60 * 60 * 1000)));
}
