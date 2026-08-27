"use server";

import { redirect } from "next/navigation";
import { registerTraveler } from "@/lib/trips";
import { setSessionEmail } from "@/lib/session";

export type LoginState = {
  error?: string;
};

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  if (!isValidEmail(email)) {
    return { error: "올바른 이메일 형식을 입력해주세요." };
  }

  try {
    await registerTraveler(email);
  } catch {
    return { error: "로그인 중 문제가 발생했습니다. 다시 시도해주세요." };
  }

  await setSessionEmail(email);
  redirect("/trips");
}
