import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // รูปสตอรี่อ่านไฟล์ฟอนต์กับโลโก้จากดิสก์ตอน request
  // ตัววิเคราะห์ของ Next มองไม่เห็นว่าไฟล์พวกนี้ถูกใช้ เพราะเป็นการอ่านด้วย
  // path ที่ประกอบขึ้นตอนรัน ต้องบอกให้ชัดว่าให้ติดไปด้วยตอน deploy
  // ไม่งั้นบนเซิร์ฟเวอร์จริงจะพังเพราะหาไฟล์ฟอนต์ไม่เจอ
  outputFileTracingIncludes: {
    "/club/share/image": [
      "src/app/club/share/fonts/**/*",
      "public/club-logo.jpg",
    ],
  },
};

export default nextConfig;
