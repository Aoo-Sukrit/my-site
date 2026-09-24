"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  NICKNAME_MAX,
  NICKNAME_MIN,
  PASSWORD_MIN,
} from "@/lib/club-limits";
import { toThaiAuthError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignupState = {
  error: string | null;
  /** ตั้งเมื่อสมัครผ่านแล้วแต่ต้องไปกดยืนยันในอีเมลก่อน */
  notice: string | null;
};

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nickname = String(formData.get("nickname") ?? "").trim();

  if (!email || !password || !nickname) {
    return { error: "กรอกให้ครบทุกช่องก่อน", notice: null };
  }
  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return {
      error: `ฉายาต้องยาว ${NICKNAME_MIN} ถึง ${NICKNAME_MAX} ตัวอักษร`,
      notice: null,
    };
  }
  if (password.length < PASSWORD_MIN) {
    return {
      error: `รหัสผ่านต้องยาวอย่างน้อย ${PASSWORD_MIN} ตัวอักษร`,
      notice: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  // เช็กฉายาซ้ำก่อน จะได้บอกตรงๆ แทนที่จะปล่อยให้ไปพังที่ trigger
  // แล้วได้ error งงๆ กลับมา (ตัวกันซ้ำจริงคือ unique index ในฐานข้อมูล)
  const { data: available, error: checkError } = await supabase.rpc(
    "nickname_available",
    { candidate: nickname },
  );

  if (!checkError && available === false) {
    return { error: "ฉายานี้มีคนใช้แล้ว ลองตั้งใหม่", notice: null };
  }

  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ??
    `https://${requestHeaders.get("host") ?? "localhost:3000"}`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // ฉายาเดินทางไปกับ raw_user_meta_data แล้ว trigger handle_new_user
      // ใน schema.sql จะหยิบไปใส่ตาราง profiles ให้
      data: { nickname },
      emailRedirectTo: `${origin}/club/auth/callback`,
    },
  });

  if (error) {
    return { error: toThaiAuthError(error), notice: null };
  }

  // ถ้าโปรเจกต์เปิด Confirm email ไว้ จะยังไม่มี session ตรงนี้
  if (!data.session) {
    return {
      error: null,
      notice:
        "สมัครเรียบร้อย ส่งลิงก์ยืนยันไปที่อีเมลแล้ว กดลิงก์ในอีเมลก่อนถึงจะเข้าใช้ได้ (เช็กเมลขยะด้วยนะ)",
    };
  }

  redirect("/club/pending");
}
