import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionEmail } from "@/lib/session";
import { logoutAction } from "@/app/trips/actions";
import { Button } from "@/components/ui/button";

export default async function TripsLayout({
  children,
}: LayoutProps<"/trips">) {
  const email = await getSessionEmail();
  if (!email) redirect("/");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/trips" className="font-semibold tracking-tight">
          날씨의 여신
        </Link>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{email}</span>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              로그아웃
            </Button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  );
}
