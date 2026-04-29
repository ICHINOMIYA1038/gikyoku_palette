/**
 * トップページ右カラム。コンセプト説明 + アクションボタン群。
 * ログイン状態に応じて CTA を出し分ける。
 */

import Link from "next/link";
import Image from "next/image";
import { Plus, LogIn, UserPlus, BookOpen, ShieldCheck, MessageSquare } from "lucide-react";

type AuthorMini = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  playCount: number;
};

type Props = {
  loggedIn: boolean;
  userName: string | null;
  stats: { playCount: number; authorCount: number; reviewCount: number };
  authors?: AuthorMini[];
};

export function HomeSidebar({ loggedIn, userName, stats, authors = [] }: Props) {
  return (
    <aside className="space-y-4">
      {/* コンセプト */}
      <section className="rounded-lg border border-gray-200 bg-gradient-to-b from-pink-50 to-white p-5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-pink-600">
          About
        </p>
        <h2 className="mt-1 font-serif text-lg font-bold text-gray-900 leading-tight">
          作家と劇団をつなぐ、
          <br />
          戯曲のプラットフォーム
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-gray-600">
          新作戯曲を発見し、上演許可をオンラインで申請・管理できます。作家は自分の作品を届け、劇団は上演したい作品に出会える場所。
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-gray-700">
          <li className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-pink-500" />
            戯曲を投稿・公開
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-pink-500" />
            上演許可の申請・承認
          </li>
          <li className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-pink-500" />
            スレッドで作家と対話
          </li>
        </ul>
      </section>

      {/* CTA */}
      {loggedIn ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Welcome back
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-gray-900">
            {userName || "マイページ"}
          </p>
          <div className="mt-3 space-y-2">
            <Link
              href="/dashboard/plays/new"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-pink-500 text-sm font-medium text-white transition-colors hover:bg-pink-600"
            >
              <Plus className="h-4 w-4" />
              作品を投稿する
            </Link>
            <Link
              href="/dashboard"
              className="flex h-10 w-full items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              マイページを開く
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-900">
            はじめる
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Googleアカウントですぐに始められます
          </p>
          <div className="mt-3 space-y-2">
            <Link
              href="/login"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-pink-500 text-sm font-medium text-white transition-colors hover:bg-pink-600"
            >
              <UserPlus className="h-4 w-4" />
              新規登録 / ログイン
            </Link>
            <Link
              href="/dashboard/plays/new"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              作品を投稿する
            </Link>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-gray-400">
            <LogIn className="h-3 w-3" />
            登録は無料 ・ 作品の投稿も無料
          </p>
        </section>
      )}

      {/* Stats */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-gray-400">
          Stats
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.playCount}</p>
            <p className="text-[10px] text-gray-500">作品</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.authorCount}</p>
            <p className="text-[10px] text-gray-500">作家</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.reviewCount}</p>
            <p className="text-[10px] text-gray-500">レビュー</p>
          </div>
        </div>
      </section>

      {/* 注目の作家(ミニ) */}
      {authors.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <header className="flex items-baseline justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-serif text-sm font-bold text-gray-900">
              注目の作家
            </h3>
            <Link
              href="/authors"
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              一覧 →
            </Link>
          </header>
          <ul className="divide-y divide-gray-100">
            {authors.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/authors/${a.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-pink-100 to-pink-200">
                    {a.avatarUrl ? (
                      <Image
                        src={a.avatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-medium text-pink-700">
                        {a.displayName.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-900">
                      {a.displayName}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {a.playCount} 作品
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* 戯曲図書館バナー */}
      <a
        href="https://gikyokutosyokan.com"
        target="_blank"
        rel="noopener noreferrer"
        className="block cursor-pointer transition-opacity hover:opacity-90"
      >
        <Image
          src="https://gikyokutosyokan-public.s3.ap-northeast-1.amazonaws.com/assets/banners/tosyokan-rect.png"
          alt="戯曲図書館"
          width={300}
          height={250}
          className="h-auto w-full rounded-lg"
        />
      </a>
    </aside>
  );
}
