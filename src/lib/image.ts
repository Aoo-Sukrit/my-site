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
  { maxEdge = 1400, maxBytes = MAX_UPLOAD_BYTES } = {},
): Promise<Blob> {
  const bitmap = await decodeOriented(file);

  try {
    let edge = maxEdge;

    for (let round = 0; round < 5; round += 1) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = drawToCanvas(bitmap, width, height);

      for (const quality of [0.85, 0.72, 0.6, 0.48]) {
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
