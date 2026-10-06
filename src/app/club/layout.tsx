import { getViewer } from "@/lib/auth";

import ClubNav from "./club-nav";

/**
 * โครงของทุกหน้าในคลับ
 *
 * มีไว้เพื่อให้แถบเมนูคลับโผล่ทุกหน้าโดยไม่ต้องไปแปะในแต่ละหน้าเอง
 * ไม่ได้บังคับสิทธิ์อะไรตรงนี้ แต่ละหน้ายังเรียก requireApproved() ของตัวเอง
 * เหมือนเดิม layout ไม่ใช่ที่กั้นสิทธิ์ที่ไว้ใจได้ เพราะ Next ข้ามมันได้ในบางกรณี
 *
 * ใช้ getViewer() ที่คืน null เฉยๆ ไม่ใช่ requireViewer() ที่เด้งไปหน้าล็อกอิน
 * เพราะ layout นี้ครอบหน้าล็อกอินกับหน้าสมัครด้วย ถ้าเด้งจะวนไม่จบ
 */
export default async function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();

  return (
    <>
      {viewer ? (
        <ClubNav
          userId={viewer.userId}
          nickname={viewer.profile.nickname}
          avatarUrl={viewer.profile.avatar_url}
          isAdmin={viewer.profile.is_admin}
        />
      ) : null}

      {children}
    </>
  );
}
