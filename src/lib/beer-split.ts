/**
 * แบ่งเบียร์ตอนคำท้าตัดสินแล้ว
 *
 * ไฟล์นี้เป็นฟังก์ชันล้วน ไม่แตะฐานข้อมูลและไม่แตะ DOM จึงเรียกได้ทั้งจาก
 * Server Component และจากไฟล์ "use client"
 *
 * กติกา (คิดแบบพนันกีฬา)
 *   - ฝั่งที่แพ้ เสียเท่าที่ตัวเองวางไว้ ทุกคน
 *   - ฝั่งที่ชนะ แบ่งเบียร์ของฝั่งแพ้ตามสัดส่วนที่ตัวเองวาง
 *   - ปัดเป็นครึ่งขวด เพราะขวดจริงผ่าครึ่งได้ แต่ผ่าเป็นเศษสามส่วนไม่ได้
 *   - ยอดรวมหลังปัดของฝั่งชนะ ต้องเท่ากับยอดที่ฝั่งแพ้เสียไปเป๊ะๆ
 *     ไม่งั้นจะมีเบียร์งอกหรือหายระหว่างทาง ซึ่งคนจริงๆ จะทะเลาะกัน
 *
 * ตัวอย่างจากโจทย์
 *   ฝั่งถึง   คนถูกท้า 4 + A 2 = 6
 *   ฝั่งไม่ถึง คนท้า  4 + B 4 = 8
 *   ถ้าถึง → คนท้าเสีย 4, B เสีย 4 รวม 8
 *            คนถูกท้าได้ 8 × 4/6 = 5.33 → 5.5
 *            A ได้        8 × 2/6 = 2.67 → 2.5
 *            รวม 8 พอดี
 *
 * วิธีปัดที่ใช้คือ largest remainder ในหน่วย "ครึ่งขวด"
 * ปัดลงให้ทุกคนก่อน เหลือเศษเท่าไหร่ค่อยแจกทีละครึ่งขวดให้คนที่เศษมากสุด
 * วิธีนี้ทำให้ผลรวมตรงเป๊ะเสมอ ซึ่งการปัดทีละคนแบบ Math.round ทำไม่ได้
 */

/** ครึ่งขวดคือหน่วยย่อยที่สุดที่ยอมให้เกิดขึ้น */
const HALVES_PER_BOTTLE = 2;

export type BeerStake = {
  /** ใครก็ได้ที่ระบุตัวตนได้ ปกติคือ profile id */
  id: string;
  /** จำนวนขวดที่วางไว้ เป็นจำนวนเต็ม 1 ถึง 12 */
  bottles: number;
};

export type BeerPayout = {
  id: string;
  /** บวกคือได้ ลบคือเสีย หน่วยเป็นขวด มีได้ถึงครึ่งขวด */
  bottles: number;
};

export type BeerSplit = {
  /** เบียร์ทั้งหมดที่ฝั่งแพ้เสียไป เท่ากับผลรวมของฝั่งชนะเสมอ */
  pot: number;
  /** ฝั่งชนะ เรียงตามลำดับที่ส่งเข้ามา ค่าเป็นบวก */
  winners: BeerPayout[];
  /** ฝั่งแพ้ เรียงตามลำดับที่ส่งเข้ามา ค่าเป็นลบ */
  losers: BeerPayout[];
};

function sumBottles(stakes: BeerStake[]): number {
  return stakes.reduce((total, stake) => total + stake.bottles, 0);
}

/**
 * @param winners ฝั่งที่ทายถูก
 * @param losers  ฝั่งที่ทายผิด
 *
 * ถ้าฝั่งใดฝั่งหนึ่งว่าง แปลว่าไม่มีการพนันเกิดขึ้นจริง คืนผลเปล่า
 * ในเกมจริงกรณีนี้ไม่เกิด เพราะพอกดรับปุ๊บคนท้ากับคนถูกท้าอยู่คนละข้างทันที
 * แต่กันไว้เผื่อแอดมินลบคำท้าไประหว่างทางแล้วข้อมูลเหลือข้างเดียว
 */
export function splitBeer(
  winners: BeerStake[],
  losers: BeerStake[],
): BeerSplit {
  const pot = sumBottles(losers);
  const winnerTotal = sumBottles(winners);

  if (
    winners.length === 0 ||
    losers.length === 0 ||
    pot <= 0 ||
    winnerTotal <= 0
  ) {
    return { pot: 0, winners: [], losers: [] };
  }

  const potHalves = Math.round(pot * HALVES_PER_BOTTLE);

  // ปัดลงก่อน แล้วจำเศษไว้ว่าใครใกล้ได้เพิ่มที่สุด
  const shares = winners.map((winner, index) => {
    const exactHalves = (potHalves * winner.bottles) / winnerTotal;
    const floorHalves = Math.floor(exactHalves);
    return {
      index,
      id: winner.id,
      stake: winner.bottles,
      halves: floorHalves,
      remainder: exactHalves - floorHalves,
    };
  });

  let leftover = potHalves - shares.reduce((sum, s) => sum + s.halves, 0);

  // เศษมากกว่าได้ก่อน เสมอกันให้คนที่วางเยอะกว่า เสมออีกก็เอาคนที่มาก่อน
  // เรียงบนสำเนาแต่แก้ค่าในวัตถุเดิม ลำดับที่คืนออกไปจึงยังเป็นลำดับที่ส่งเข้ามา
  const queue = [...shares].sort(
    (a, b) =>
      b.remainder - a.remainder || b.stake - a.stake || a.index - b.index,
  );

  for (const share of queue) {
    if (leftover <= 0) break;
    share.halves += 1;
    leftover -= 1;
  }

  return {
    pot,
    winners: shares.map((share) => ({
      id: share.id,
      bottles: share.halves / HALVES_PER_BOTTLE,
    })),
    losers: losers.map((loser) => ({
      id: loser.id,
      bottles: -loser.bottles,
    })),
  };
}

/** "5.5 ขวด" / "3 ขวด" — ไม่เอา .0 ท้ายมาให้รก */
export function formatBottles(bottles: number): string {
  const size = Math.abs(bottles);
  const text = Number.isInteger(size) ? String(size) : size.toFixed(1);
  return `${text} ขวด`;
}
