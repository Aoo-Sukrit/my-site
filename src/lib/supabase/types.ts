export const PROFILE_STATUSES = [
  "pending",
  "approved",
  "blocked",
  "removed",
] as const;

export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export type Profile = {
  id: string;
  nickname: string;
  caption: string | null;
  about: string | null;
  avatar_url: string | null;
  status: ProfileStatus;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * คอลัมน์ที่ผู้ใช้ทั่วไปอ่านได้
 *
 * ต้องระบุชื่อคอลัมน์เองแทนการใช้ * เพราะ schema.sql ข้อ 7 ถอนสิทธิ์ select
 * คอลัมน์ email ออกจาก role authenticated ไปแล้ว ถ้ายิง select * Postgres
 * จะตอบ permission denied for column email
 */
export const PROFILE_COLUMNS =
  "id, nickname, caption, about, avatar_url, status, is_admin, created_at, updated_at";

/** เฉพาะหน้าแอดมิน ได้มาจากฟังก์ชัน admin_member_list() เท่านั้น */
export type ProfileWithEmail = Profile & { email: string | null };

export const STATUS_LABEL: Record<ProfileStatus, string> = {
  pending: "รออนุมัติ",
  approved: "สมาชิก",
  blocked: "ถูกระงับ",
  removed: "เอาออกจากคลับแล้ว",
};

/** สถานะที่ยังไม่ถือว่าจบเรื่อง แอดมินอาจต้องกลับมาจัดการอีก */
export function isInactiveStatus(status: ProfileStatus) {
  return status === "blocked" || status === "removed";
}

export function isProfileStatus(value: unknown): value is ProfileStatus {
  return (
    typeof value === "string" &&
    (PROFILE_STATUSES as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
//  ผลวิ่ง (003_runs.sql)
// ---------------------------------------------------------------------------

export type RoundStatus = "open" | "closed";

export type Round = {
  id: string;
  /** วันที่ 1 ของเดือนนั้น เช่น 2026-09-01 */
  month: string;
  status: RoundStatus;
  /** เริ่มให้ตั้งเป้าและโหวต แอดมินแก้ได้ ไม่ได้ฝังไว้ในโค้ด */
  target_opens_at: string;
  /** ปิดรับเป้าและโหวต หลังเวลานี้ผลถึงเปิดให้ทุกคนเห็น */
  target_locks_at: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
//  เกมตั้งเป้ารายเดือน (006_targets.sql)
//  ทุกชนิดข้างล่างมาจากฟังก์ชัน security definer ไม่ได้ query ตารางตรง
//  เพราะตาราง targets กับ target_votes ถูกปิดสิทธิ์ไว้ทั้งหมด
// ---------------------------------------------------------------------------

export type MyTargetState = {
  has_target: boolean;
  base_km: string | null;
  vote_count: number;
};

export type VotableMember = {
  member_id: string;
  nickname: string;
  caption: string | null;
  avatar_url: string | null;
};

export type MyVote = VotableMember & {
  subject_id: string;
  delta: number;
  created_at: string;
};

export type RoundTargetRow = {
  member_id: string;
  nickname: string;
  caption: string | null;
  avatar_url: string | null;
  base_km: string;
  total_delta: number;
  final_km: string;
  vote_count: number;
};

export type PercentRow = {
  member_id: string;
  nickname: string;
  caption: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  base_km: string | null;
  final_km: string | null;
  total_km: string;
  percent: string | null;
  rank_no: number;
};

export type Run = {
  id: string;
  profile_id: string;
  round_id: string;
  ran_on: string;
  /** PostgREST ส่ง numeric กลับมาเป็น string เพื่อไม่ให้ความละเอียดหาย */
  distance_km: string;
  source: string;
  /** ที่อยู่ไฟล์ในบัคเก็ต proofs ไม่ใช่ URL เต็ม ต้องขอ signed url ก่อนแสดง */
  proof_url: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type RunEdit = {
  id: string;
  run_id: string;
  profile_id: string | null;
  edited_by: string | null;
  action: "update" | "delete";
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  edited_at: string;
};

/** หนึ่งแถวบนกระดาน มาจากฟังก์ชัน month_leaderboard() */
export type LeaderboardRow = {
  member_id: string;
  nickname: string;
  caption: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  total_km: string;
  run_count: number;
  rank_no: number;
};

/** แอปที่มาของผลวิ่ง เรียงตามที่เพื่อนๆ ใช้กันบ่อย */
export const RUN_SOURCES = [
  "Garmin",
  "Strava",
  "Suunto",
  "COROS",
  "Mi Fitness",
  "Samsung Health",
  "อื่นๆ",
] as const;

export type RunSource = (typeof RUN_SOURCES)[number];

export function isRunSource(value: unknown): value is RunSource {
  return (
    typeof value === "string" && (RUN_SOURCES as readonly string[]).includes(value)
  );
}
