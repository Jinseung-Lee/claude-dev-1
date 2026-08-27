import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/middleware";

// Next.js 16부터 middleware가 proxy로 이름이 바뀌었다(기능은 동일).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
