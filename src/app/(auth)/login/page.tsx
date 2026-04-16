import { signIn } from "@/lib/auth";
import { Pen, ShieldCheck, Star } from "lucide-react";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string };
}) {
  const redirectTo = searchParams.redirectTo || "/dashboard";

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Left Panel - Brand / Description (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-50">
        <div className="flex flex-col justify-center px-12 xl:px-16 max-w-xl mx-auto">
          <h1 className="text-4xl xl:text-5xl font-bold font-serif text-gray-900 mb-4">
            戯曲パレット
          </h1>
          <p className="text-lg text-gray-500 mb-12 leading-relaxed">
            あなたの戯曲を世界に届ける。
            <br />
            上演許可の管理から収益化まで、劇作家のためのプラットフォーム。
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-gray-200 shrink-0">
                <Pen className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-gray-900 mb-1">
                  作品の投稿・公開
                </h3>
                <p className="text-sm text-gray-500">
                  戯曲を登録し、あらすじや本文をオンラインで公開できます
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-gray-200 shrink-0">
                <ShieldCheck className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-gray-900 mb-1">
                  上演許可の管理
                </h3>
                <p className="text-sm text-gray-500">
                  上演許可の申請・承認をオンラインで完結。許可証もPDFで発行
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-gray-200 shrink-0">
                <Star className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-gray-900 mb-1">
                  レビュー・評価
                </h3>
                <p className="text-sm text-gray-500">
                  読者からのレビューや評価で、作品の魅力を広げましょう
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile-only brand header */}
          <div className="lg:hidden text-center mb-2">
            <h1 className="text-3xl font-bold font-serif text-gray-900 mb-2">
              戯曲パレット
            </h1>
            <p className="text-sm text-gray-500">
              劇作家のためのプラットフォーム
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-gray-900">
                ログイン
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Googleアカウントでログインしてください
              </p>
            </div>

            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo });
              }}
            >
              <button
                type="submit"
                className="w-full h-12 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
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
                Googleでログイン
              </button>
            </form>

            <div className="space-y-2 pt-4">
              <p className="text-sm text-center text-gray-500">
                <a href="https://gikyokutosyokan.com" className="text-gray-700 hover:underline" target="_blank" rel="noopener">戯曲図書館</a>と共通のアカウントでご利用いただけます。
              </p>
              <p className="text-xs text-center text-gray-400">
                新規登録はGoogleアカウントで自動的に行われます
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
