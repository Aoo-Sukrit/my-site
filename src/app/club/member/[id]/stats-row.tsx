/**
 * ตัวเลขสามช่องใต้หัวโปรไฟล์
 *
 * ไม่มีกรอบ คั่นด้วยเส้นบางตาม mockup ใช้ grid สามคอลัมน์ตายตัวไม่ใช่ flex
 * เพราะต้องอยู่แถวเดียวกันบนจอ 375px เสมอ ห้ามตกบรรทัด
 */
export default function StatsRow({
  items,
}: {
  /**
   * pending = ค่านี้ยังไม่มีจริง เช่น "รอเปิดผล" จะแสดงเป็นตัวเล็กสีจาง
   * ไม่ให้เด่นเท่าตัวเลขจริงสองช่องข้างๆ
   */
  items: { value: string; unit?: string; label: string; pending?: boolean }[];
}) {
  return (
    <section className="grid grid-cols-3 divide-x divide-border">
      {items.map((item) => (
        <div key={item.label} className="space-y-0.5 px-1 text-center">
          <p
            className={
              item.pending
                ? // สูงเท่าบรรทัดตัวเลข (h-7 / sm:h-8) ป้ายข้างล่างจะได้ตรงแนวกับอีกสองช่อง
                  "flex h-7 items-center justify-center text-sm text-muted sm:h-8"
                : "font-display text-xl font-semibold text-accent-strong sm:text-2xl"
            }
          >
            {item.value}
            {item.unit ? (
              <span className="ml-1 text-xs font-normal text-muted">
                {item.unit}
              </span>
            ) : null}
          </p>
          <p className="text-[11px] leading-snug text-muted">{item.label}</p>
        </div>
      ))}
    </section>
  );
}
