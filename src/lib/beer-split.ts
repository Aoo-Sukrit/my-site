/**
 * แบ่งเบียร์ตอนคำท้าตัดสินแล้ว แบบกองกลาง หารเท่ากัน
 *
 * ไฟล์นี้เป็นฟังก์ชันล้วน ไม่แตะฐานข้อมูลและไม่แตะ DOM จึงเรียกได้ทั้งจาก
 * Server Component และจากไฟล์ "use client"
 *
 * กติกา (ตกลงกันวันที่ 7 ต.ค. 2569 ดู 20261007120000_challenge_shared_pot.sql)
 *   - กอง = คนท้าวาง 1–12 + เพื่อนแต่ละคนเติม 0–3
 *   - ฝั่งแพ้จ่ายทั้งกอง หารเท่ากันทุกคนในฝั่ง
 *   - ฝั่งชนะรับทั้งกอง หารเท่ากันทุกคนในฝั่ง
 *   - ไม่ปัดเศษ หารได้ 5.25 ก็ 5.25 จะจ่ายเป็นเบียร์หรือเงินไปตกลงกันเอง
 *
 * ตัวอย่าง: คนท้า 12 + เพื่อน A เติม 3 อยู่ฝั่งไม่ถึง (กอง 15)
 *           คนถูกท้า + เพื่อน B ร่วมหุ้น +0 อยู่ฝั่งถึง
 *   ถ้าถึง  → คนท้า −7.5, A −7.5, คนถูกท้า +7.5, B +7.5
 *   ถ้าไม่ถึง → กลับข้างกัน
 *
 * (ของเดิมแบ่งตามสัดส่วนที่แต่ละคนวาง ได้กับเสียเลยไม่เท่ากันระหว่างสองกรณี
 * จนเพื่อนในกลุ่มงง จึงเปลี่ยนเป็นแบบนี้)
 */

export type BeerPayout = {
  id: string;
  /** บวกคือได้ ลบคือเสีย หน่วยเป็นขวด เป็นทศนิยมได้ */
  bottles: number;
};

export type BeerSplit = {
  /** ทั้งกอง เท่ากับผลรวมที่ฝั่งชนะได้ และผลรวมที่ฝั่งแพ้เสีย */
  pot: number;
  /** ฝั่งชนะ เรียงตามลำดับที่ส่งเข้ามา ค่าเป็นบวก */
  winners: BeerPayout[];
  /** ฝั่งแพ้ เรียงตามลำดับที่ส่งเข้ามา ค่าเป็นลบ */
  losers: BeerPayout[];
};

/** ส่วนแบ่งต่อคนเมื่อหารกองให้ count คน ไม่มีใครในฝั่งคืน 0 */
export function sharePerPerson(pot: number, count: number): number {
  return count > 0 ? pot / count : 0;
}

/**
 * @param pot        ทั้งกอง
 * @param winnerIds  ทุกคนในฝั่งที่ทายถูก
 * @param loserIds   ทุกคนในฝั่งที่ทายผิด
 *
 * ถ้าฝั่งใดฝั่งหนึ่งว่าง แปลว่าไม่มีใครให้จ่ายหรือรับ คืนผลเปล่า
 * ในเกมจริงไม่เกิด เพราะคู่ท้าอยู่คนละฝั่งตั้งแต่ตอนท้า
 */
export function splitPot(
  pot: number,
  winnerIds: string[],
  loserIds: string[],
): BeerSplit {
  if (winnerIds.length === 0 || loserIds.length === 0 || pot <= 0) {
    return { pot: 0, winners: [], losers: [] };
  }

  const gain = sharePerPerson(pot, winnerIds.length);
  const loss = sharePerPerson(pot, loserIds.length);

  return {
    pot,
    winners: winnerIds.map((id) => ({ id, bottles: gain })),
    losers: loserIds.map((id) => ({ id, bottles: -loss })),
  };
}

/**
 * "7.5 ขวด" / "5.25 ขวด" / "3 ขวด"
 * ทศนิยมไม่เกินสองตำแหน่ง แล้วตัดศูนย์ท้ายทิ้ง ไม่ให้ขึ้น 3.00 ให้รก
 */
export function formatBottles(bottles: number): string {
  const size = Math.abs(bottles);
  const text = String(Math.round(size * 100) / 100);
  return `${text} ขวด`;
}
