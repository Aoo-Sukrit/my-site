import { bodySegments } from "@/lib/post-rules";

/**
 * เนื้อความของโพสต์
 *
 * ข้อความธรรมดา ขึ้นบรรทัดใหม่ได้ ลิงก์กดได้ ไม่มี markdown
 *
 * ตั้งใจไม่แปลงเป็น HTML แล้วยัดด้วย dangerouslySetInnerHTML เพราะข้อความ
 * มาจากช่องกรอก ถ้า render เป็น HTML ดิบเมื่อไหร่ก็เปิดทางให้ฝัง script ทันที
 * วิธีนี้ปลอดภัยโดยโครงสร้าง ทุกชิ้นเป็น text node ของ React
 * ส่วนการขึ้นบรรทัดใหม่ปล่อยให้ whitespace-pre-wrap จัดการ
 */
export default function PostBody({ body }: { body: string }) {
  const text = body.trim();
  if (!text) return null;

  return (
    <div className="whitespace-pre-wrap text-base leading-relaxed">
      {bodySegments(text).map((segment, index) =>
        segment.type === "link" ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-accent-strong underline underline-offset-2 hover:opacity-80"
          >
            {segment.value}
          </a>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </div>
  );
}
