import type { Metadata } from "next";
import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Pen, ShieldCheck, Star, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "ログイン",
  description:
    "戯曲パレットにログインして、作品の投稿・上演許可の管理・レビューを始めよう。Googleアカウントで無料ですぐに始められます。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo: to } = await searchParams;
  const redirectTo = to || "/dashboard";

  // 既にログイン済みなら dashboard に飛ばす
  const session = await auth();
  if (session?.user?.id) redirect(redirectTo);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-pink-50/60 via-white to-white">
      <div className="container mx-auto max-w-6xl px-4 py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Brand / Value Proposition */}
          <div className="lg:pr-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-700">
              <Sparkles className="h-3.5 w-3.5" />
              登録・作品投稿は無料
            </span>
            <h1 className="mt-4 font-serif text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 leading-tight">
              あなたの戯曲を、
              <br />
              世界に届けよう。
            </h1>
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              作品の公開から上演許可の申請・管理、収益化までをオンラインで完結できる、
              劇作家のためのプラットフォームです。
            </p>

            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200">
                  <Pen className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">
                    作品の投稿・公開
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    戯曲のあらすじ・本文・PDFをオンラインで公開
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200">
                  <ShieldCheck className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">
                    上演許可の申請・管理
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    申請から承認・決済・許可証発行までワンストップ
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200">
                  <Star className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">
                    レビュー・評価
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    読者や劇団からのフィードバックで作品の魅力を広げる
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Right: Login Card */}
          <div className="lg:pl-4">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-7 md:p-8 shadow-sm">
              <div className="text-center">
                <h2 className="font-serif text-2xl font-bold text-gray-900">
                  ログイン / 新規登録
                </h2>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  Googleアカウントで
                  <br className="sm:hidden" />
                  かんたん・安全に始められます
                </p>
              </div>

              <form
                className="mt-6"
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo });
                }}
              >
                <button
                  type="submit"
                  className="group relative w-full h-12 inline-flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white text-base font-medium text-gray-800 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Googleで続ける
                </button>
              </form>

              <div className="mt-5 rounded-md bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs text-gray-600 leading-relaxed">
                  <strong className="font-medium text-gray-900">
                    初めての方も同じボタンから登録できます。
                  </strong>
                  <br />
                  初回ログイン時にアカウントが自動作成されます。
                </p>
              </div>

              <p className="mt-4 text-[11px] text-center text-gray-400 leading-relaxed">
                ログインにより
                <Link
                  href="/terms"
                  className="text-gray-500 underline hover:text-gray-700"
                >
                  利用規約
                </Link>
                および
                <Link
                  href="/privacy"
                  className="text-gray-500 underline hover:text-gray-700"
                >
                  プライバシーポリシー
                </Link>
                に同意したものとみなされます。
              </p>
            </div>

            <p className="mt-4 text-center text-xs text-gray-400">
              姉妹サイト{" "}
              <a
                href="https://gikyokutosyokan.com"
                className="text-gray-600 underline hover:text-gray-800"
                target="_blank"
                rel="noopener"
              >
                戯曲図書館
              </a>{" "}
              と共通のアカウントで利用できます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
