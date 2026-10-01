import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

/**
 * ข้อมูลสำหรับตอนกด "เพิ่มไปยังหน้าจอโฮม" บนมือถือ
 *
 * ถ้าไม่มีไฟล์นี้ มือถือจะไปเดาเอาเองจากหน้าเว็บ แล้วมักได้ไอคอนเบลอๆ
 * กับชื่อยาวเหยียดจาก <title>
 *
 * สีที่ใช้ลอกมาจาก token ชุดที่ตรึงค่าไว้ใน globals.css ไม่ได้ตั้งสีใหม่
 *   background_color  --club-cream  สีพื้นตอนเปิดแอปค้างรอหน้าแรกโหลด
 *   theme_color       --club-line   สีแถบบนสุดของเบราว์เซอร์
 *
 * ใช้ค่าที่ตรึงไว้ ไม่ใช่ --background กับ --accent เพราะสองตัวนั้นสลับตาม
 * โหมดมืด แต่ไฟล์นี้เป็นค่าคงที่ไฟล์เดียว เลือกตามโหมดของคนเปิดไม่ได้
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "AOOOKULELE",
    description: site.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ea",
    theme_color: "#9c4a25",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
