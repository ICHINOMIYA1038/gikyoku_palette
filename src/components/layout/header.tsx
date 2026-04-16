import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function Header() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 max-w-5xl">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-bold font-serif text-gray-900">
            戯曲パレット
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors">作品を探す</Link>
            <Link href="/authors" className="text-gray-500 hover:text-gray-900 transition-colors">作家一覧</Link>
            <Link href="/rankings" className="text-gray-500 hover:text-gray-900 transition-colors">ランキング</Link>
          </nav>
        </div>
        <nav className="flex items-center gap-3">
          {session?.user ? (
            <div className="flex items-center gap-3 text-sm">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 transition-colors">
                {session.user.name || "マイページ"}
              </Link>
              <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                <button type="submit" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
                  ログアウト
                </button>
              </form>
              <Link href="/dashboard/plays/new" className="inline-flex h-8 items-center justify-center rounded-md bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
                投稿する
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <Link href="/login" className="text-gray-500 hover:text-gray-900 transition-colors">ログイン</Link>
              <Link href="/dashboard/plays/new" className="inline-flex h-8 items-center justify-center rounded-md bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
                投稿する
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
