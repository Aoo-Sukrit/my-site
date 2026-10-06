/**
 * ตัวเลขสามช่องใต้หัวโปรไฟล์
 *
 * ไม่มีกรอบ คั่นด้วยเส้นบางตาม mockup ใช้ grid สามคอลัมน์ตายตัวไม่ใช่ flex
 * เพราะต้องอยู่แถวเดียวกันบนจอ 375px เสมอ ห้ามตกบรรทัด
 */
export default function StatsRow({
  items,
}: {
  items: { value: string; unit?: string; label: string }[];
}) {
  return (
    <section className="grid grid-cols-3 divide-x divide-border">
      {items.map((item) => (
        <div key={item.label} className="space-y-0.5 px-1 text-center">
          <p className="font-display text-xl font-semibold text-accent-strong sm:text-2xl">
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
