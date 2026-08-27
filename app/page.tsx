import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/session";
import { LoginForm } from "@/app/login-form";

export default async function Home() {
  const email = await getSessionEmail();
  if (email) redirect("/trips");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">날씨의 여신</h1>
        <p className="max-w-sm text-muted-foreground">
          여행 일정을 등록하면 도시별 날씨를 한 곳에서 확인할 수 있습니다.
          이메일만 입력하면 바로 시작할 수 있습니다.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
