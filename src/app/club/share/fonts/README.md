# ฟอนต์สำหรับรูปสตอรี่

ไฟล์ในโฟลเดอร์นี้ใช้ตอนวาดรูปกระดานด้วย `next/og` ที่ `../image/route.tsx`
เท่านั้น ไม่ได้ใช้บนหน้าเว็บ (หน้าเว็บโหลดฟอนต์ผ่าน `next/font/google` ใน
`src/app/layout.tsx`)

ต้องเก็บเป็นไฟล์ไว้ในโปรเจกต์ เพราะ `next/og` วาดด้วย satori ซึ่งไม่มีฟอนต์ไทย
ติดมาเลย ถ้าไม่ส่งไฟล์ฟอนต์เข้าไปเอง ตัวหนังสือไทยจะออกมาเป็นสี่เหลี่ยมเปล่า
และ satori รับแค่ `ttf` `otf` `woff` เท่านั้น ใช้ `woff2` ไม่ได้

## ไฟล์

| ไฟล์ | ฟอนต์ | น้ำหนัก | ใช้กับ |
| --- | --- | --- | --- |
| `anuphan-400.woff` | Anuphan | 400 | ตัวเนื้อความในรูป |
| `anuphan-600.woff` | Anuphan | 600 | ชื่อคนและตัวเน้น |
| `plex-thai-looped-600.woff` | IBM Plex Sans Thai Looped | 600 | หัวข้อและตัวเลขระยะ |

เลือก IBM Plex Sans Thai **Looped** เพื่อให้ตรงกับฟอนต์หัวข้อบนหน้าเว็บ
(`--font-display` ใน `globals.css`) ไม่ใช่ตัวธรรมดาที่ไม่มีหัวห่วง

## ที่มาและลิขสิทธิ์

โหลดจาก Google Fonts ทั้งสองตัวอยู่ภายใต้ **SIL Open Font License 1.1**
ซึ่งอนุญาตให้ใช้ ฝัง และแจกจ่ายต่อได้ รวมถึงงานเชิงพาณิชย์ โดยมีเงื่อนไขว่า
ต้องแนบประกาศลิขสิทธิ์ไปด้วย และห้ามขายตัวฟอนต์แยกเดี่ยวๆ

- Anuphan — ผู้ออกแบบ Cadson Demak · https://fonts.google.com/specimen/Anuphan
- IBM Plex Sans Thai Looped — ผู้ออกแบบ IBM และ Cadson Demak ·
  https://fonts.google.com/specimen/IBM+Plex+Sans+Thai+Looped
- ตัวบทสัญญาอนุญาต https://openfontlicense.org

## ถ้าต้องโหลดใหม่หรือเพิ่มน้ำหนัก

Google Fonts จะส่ง `woff2` มาให้เบราว์เซอร์สมัยใหม่ ซึ่ง satori ใช้ไม่ได้
ต้องขอด้วย User-Agent เก่าเพื่อให้ได้ `woff` กลับมาแทน

```
https://fonts.googleapis.com/css2?family=Anuphan:wght@400;600&subset=thai,latin
```

แล้วเพิ่มไฟล์ใหม่ใน `loadFonts()` ที่ `../assets.ts` ด้วย
