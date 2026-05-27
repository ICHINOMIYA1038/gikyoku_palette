"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  // 集中入力するフォーム/エディタ系ページではフッターを隠す
  if (/^\/dashboard\/(plays|series)\/(new|.+\/edit)/.test(pathname) || pathname.startsWith("/editor/")) {
    return null;
  }
  return (
    <footer className="border-t border-gray-200 bg-gray-900 text-gray-400 pt-12 pb-8">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <span className="text-lg font-bold font-serif text-white">戯曲パレット</span>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              戯曲の投稿・公開・上演許可をワンストップで。
              作家と劇団をつなぐプラットフォームです。
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-300">サイト案内</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-gray-300 transition-colors">作品を探す</Link>
              </li>
              <li>
                <Link href="/authors" className="text-gray-400 hover:text-gray-300 transition-colors">作家一覧</Link>
              </li>
              <li>
                <Link href="/rankings" className="text-gray-400 hover:text-gray-300 transition-colors">ランキング</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-300">ヘルプ</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-gray-300 transition-colors">お問い合わせ</Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-gray-300 transition-colors">利用規約</Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-gray-300 transition-colors">プライバシーポリシー</Link>
              </li>
              <li>
                <Link href="/legal" className="text-gray-400 hover:text-gray-300 transition-colors">特定商取引法に基づく表記</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-300">姉妹サイト</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://gikyokutosyokan.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  戯曲図書館
                </a>
                <p className="text-xs text-gray-500 mt-1">共通アカウントで利用可能</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} 戯曲パレット
          </p>
          <p className="text-xs text-gray-500">
            電気通信事業届出番号: A-08-23628（令和8年5月18日届出）
          </p>
        </div>
      </div>
    </footer>
  );
}
