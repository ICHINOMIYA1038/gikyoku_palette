import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

export async function Header() {
  const session = await auth();
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  if (session?.user?.id) {
    const rows = await prisma.$queryRaw<
      Array<{ displayName: string | null; name: string | null; avatarUrl: string | null; image: string | null }>
    >`
      SELECT "displayName", name, "avatarUrl", image
      FROM "User" WHERE id = ${session.user.id}
    `;
    const u = rows[0];
    displayName = u?.displayName || u?.name || session.user.name || "マイページ";
    avatarUrl = u?.avatarUrl || u?.image || null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-serif text-lg font-bold text-gray-900"
          >
            戯曲パレット
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link
              href="/"
              className="text-gray-500 transition-colors hover:text-gray-900"
            >
              作品を探す
            </Link>
            <Link
              href="/authors"
              className="text-gray-500 transition-colors hover:text-gray-900"
            >
              作家一覧
            </Link>
            <Link
              href="/rankings"
              className="text-gray-500 transition-colors hover:text-gray-900"
            >
              ランキング
            </Link>
          </nav>
        </div>
        <nav className="flex items-center gap-3">
          {session?.user ? (
            <div className="flex items-center gap-2 text-sm">
              <NotificationBell />
              <UserMenu
                name={displayName!}
                avatarUrl={avatarUrl}
                signOutAction={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              />
              <Link
                href="/dashboard/plays/new"
                className="inline-flex h-8 items-center justify-center rounded-md bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                投稿する
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <Link
                href="/login"
                className="text-gray-500 transition-colors hover:text-gray-900"
              >
                ログイン
              </Link>
              <Link
                href="/dashboard/plays/new"
                className="inline-flex h-8 items-center justify-center rounded-md bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                投稿する
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
