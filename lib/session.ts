import { cookies } from "next/headers";

const COOKIE_NAME = "traveler_email";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getSessionEmail(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setSessionEmail(email: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
