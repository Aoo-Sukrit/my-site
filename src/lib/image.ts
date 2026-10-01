import { AVATAR_THUMB_MAX_BYTES, AVATAR_THUMB_WIDTH } from "./avatar-thumb";

/**
 * งานรูปฝั่งเบราว์เซอร์ ใช้ร่วมกันระหว่างรูปโปรไฟล์กับรูปหลักฐานการวิ่ง
 * ไฟล์นี้แตะ document กับ canvas จึงเรียกได้จาก Client Component เท่านั้น
 */

/** เพดานของทั้งสองบัคเก็ตคือ 500KB เผื่อระยะไว้หน่อย */
export const MAX_UPLOAD_BYTES = 450_000;

export function toJpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
}

/**
 * อ่านไฟล์รูปโดยหมุนให้ถูกด้านก่อน
 *
 * imageOrientation: "from-image" สำคัญมากกับรูปจากมือถือ ข้อมูลการหมุนอยู่ใน
 * EXIF ไม่ใช่ในพิกเซล ถ้าไม่สั่งตรงนี้รูปที่ถ่ายแนวตั้งจะกลายเป็นนอนตะแคง
 */
export function decodeOriented(file: Blob) {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function drawToCanvas(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("เบราว์เซอร์นี้จัดการรูปให้ไม่ได้");
  context.drawImage(bitmap, 0, 0, width, height);

  return canvas;
}

/**
 * ย่อรูปทั้งใบให้ไม่เกินเพดาน ใช้กับรูปหลักฐานซึ่งไม่ต้องครอป
 *
 * ไล่ลดคุณภาพก่อน ถ้ายังไม่พอค่อยลดขนาดภาพแล้ววนใหม่
 * รูปหลักฐานมักเป็นภาพหน้าจอแอปวิ่งที่มีตัวเลขเล็กๆ จึงเริ่มที่ด้านยาว
 * 1400px เพื่อให้ยังอ่านตัวเลขออก
 */
export async function shrinkToJpeg(
  file: Blob,
  {
    maxEdge = 1400,
    maxBytes = MAX_UPLOAD_BYTES,
    // คุณภาพที่อยากได้เป็นอันดับแรก ถ้าไฟล์ยังใหญ่เกินค่อยไล่ลดลงไปเอง
    quality: firstQuality = 0.85,
  } = {},
): Promise<Blob> {
  const bitmap = await decodeOriented(file);

  try {
    let edge = maxEdge;
    const ladder = [firstQuality, 0.72, 0.6, 0.48].filter(
      (value, index, all) => all.indexOf(value) === index,
    );

    for (let round = 0; round < 5; round += 1) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = drawToCanvas(bitmap, width, height);

      for (const quality of ladder) {
        const blob = await toJpegBlob(canvas, quality);
        if (blob && blob.size <= maxBytes) return blob;
      }

      edge = Math.round(edge * 0.75);
    }
  } finally {
    bitmap.close();
  }

  throw new Error("ย่อรูปให้เล็กพอไม่ได้ ลองเลือกรูปอื่น");
}

/**
 * รูปโปรไฟล์ขนาดเล็กสำหรับรูปสตอรี่
 *
 * ย่อตามความกว้าง ไม่ใช่ด้านยาว เพราะรูปโปรไฟล์เป็นแนวตั้ง 3:4 เสมอ
 * และสิ่งที่ต้องคุมคือความกว้างที่ไปโผล่ในแก้วบนโพเดียม
 *
 * ต่างจาก shrinkToJpeg() ตรงที่ตัวนั้นคุมด้านยาว ใช้กับรูปหลักฐานซึ่งเป็น
 * ภาพหน้าจอแนวไหนก็ได้
 */
export async function makeAvatarThumb(source: Blob): Promise<Blob> {
  const bitmap = await decodeOriented(source);

  try {
    const scale = Math.min(1, AVATAR_THUMB_WIDTH / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = drawToCanvas(bitmap, width, height);

    for (const quality of [0.8, 0.68, 0.55]) {
      const blob = await toJpegBlob(canvas, quality);
      if (blob && blob.size <= AVATAR_THUMB_MAX_BYTES) return blob;
    }

    // ต่อให้ยังเกินเพดานนิดหน่อยก็ยังเล็กกว่าไฟล์เต็มหลายเท่า ใช้ไปเถอะ
    const last = await toJpegBlob(canvas, 0.45);
    if (last) return last;
  } finally {
    bitmap.close();
  }

  throw new Error("สร้างรูปเล็กไม่สำเร็จ");
}

/**
 * เตรียมรูปที่ผู้ใช้เลือก ก่อนส่งเข้าหน้าครอป
 *
 * ย่อรูป 12 ล้านพิกเซลจากมือถือลงก่อน ไม่งั้นหน้าครอปกินแรมจนค้าง
 * และการเขียนใหม่เป็น JPEG ทำให้ EXIF หายไปเอง หลังจากหมุนภาพให้ถูกด้านแล้ว
 * ขั้นตอนครอปหลังจากนี้จึงไม่ต้องกังวลเรื่องการหมุนอีก
 *
 * คุณภาพสูงไว้ก่อนเพราะยังต้องเอาไปครอปแล้วบีบอีกรอบ
 */
export function normalizeForCrop(file: Blob, maxEdge = 1600): Promise<Blob> {
  return shrinkToJpeg(file, {
    maxEdge,
    // ขั้นนี้ยังไม่ต้องคุมขนาดไฟล์ เดี๋ยวตอนครอปค่อยบีบให้เข้าเพดานจริง
    maxBytes: Number.MAX_SAFE_INTEGER,
    quality: 0.92,
  });
}
