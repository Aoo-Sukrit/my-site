// แก้ชื่อ/คำโปรยของเว็บที่เดียวตรงนี้ แล้วมันจะเปลี่ยนทั้งเว็บ
export const site = {
  name: "AOOOKULELE & CO.",
  tagline:
    "anything about aoookulele — made for fun, forever under construction",
} as const;

// label = ตัวที่โผล่ในเมนู, headerTitle = ชื่อของหน้านั้นที่โผล่มุมซ้ายบน
// (เว้นว่าง = ไม่แสดงอะไรเลย)
export const navLinks = [
  { href: "/", label: "HOME", headerTitle: "" },
  { href: "/about", label: "ABOUT", headerTitle: "ABOUT" },
  { href: "/blog", label: "BLOG", headerTitle: "BLOG" },
  { href: "/club", label: "CLUB", headerTitle: "BEER NOW RUN LATER" },
] as const;
