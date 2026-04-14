import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function Header() {
  const session = await auth();

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-gray-900">
            戯曲パレット
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">作品を探す</Link>
            {session && (
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">ダッシュボード</Link>
            )}
          </nav>
        </div>

        <nav className="flex items-center gap-3">
          {session?.user ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                {session.user.name || "ユーザー"}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button variant="outline" size="sm" type="submit">
                  ログアウト
                </Button>
              </form>
            </div>
          ) : (
            <Button render={<Link href="/login" />} size="sm">
              ログイン
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
