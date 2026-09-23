// แก้ชื่อ/คำโปรยของเว็บที่เดียวตรงนี้ แล้วมันจะเปลี่ยนทั้งเว็บ
export const site = {
  name: "บันทึกของผม",
  tagline: "ที่เก็บเรื่องเล่า ความคิด และของสะสมเล็กๆ น้อยๆ",
} as const;

export const navLinks = [
  { href: "/", label: "หน้าแรก" },
  { href: "/about", label: "เกี่ยวกับผม" },
  { href: "/blog", label: "บล็อก" },
] as const;
