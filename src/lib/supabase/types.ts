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
  "id, nickname, avatar_url, status, is_admin, created_at, updated_at";

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
