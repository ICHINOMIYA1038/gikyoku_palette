"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Library,
  Banknote,
  Bell,
  User,
  MessageCircle,
  Heart,
  UserPlus,
  MoreHorizontal,
  X,
  FileText,
  Inbox,
} from "lucide-react";
import { NavLink } from "@/components/dashboard/nav-link";

export const dynamic = "force-dynamic";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">
      {children}
    </p>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  // 集中して入力するフォーム系ページではモバイル下部ナビを隠す
  const hideMobileNav = /^\/dashboard\/(plays|series)\/(new|.+\/edit)/.test(pathname);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="flex gap-8">
        {/* サイドナビ (md以上) */}
        <nav className="hidden md:block w-52 shrink-0">
          <div className="sticky top-28 space-y-1">
            <NavLink href="/dashboard" icon={LayoutDashboard}>
              概要
            </NavLink>
            <NavLink href="/dashboard/notifications" icon={Bell}>
              通知
            </NavLink>
            <NavLink href="/profile/edit" icon={User}>
              プロフィール
            </NavLink>

            <SectionLabel>作品を上演する</SectionLabel>
            <NavLink href="/bookmarks" icon={Heart}>
              お気に入り
            </NavLink>
            <NavLink href="/following" icon={UserPlus}>
              フォロー
            </NavLink>
            <NavLink href="/permissions" icon={FileText}>
              マイ申請
            </NavLink>
            <NavLink href="/threads" icon={MessageCircle}>
              メッセージ
            </NavLink>

            <SectionLabel>作品を書く</SectionLabel>
            <NavLink href="/dashboard/plays" icon={BookOpen}>
              作品管理
            </NavLink>
            <NavLink href="/dashboard/series" icon={Library}>
              シリーズ
            </NavLink>
            <NavLink href="/dashboard/sales" icon={Banknote}>
              売上
            </NavLink>

            <SectionLabel>上演依頼管理</SectionLabel>
            <NavLink href="/dashboard/permissions" icon={Inbox}>
              受信した申請
            </NavLink>
          </div>
        </nav>

        {/* モバイルナビ (md未満) */}
        <nav className={`${hideMobileNav ? "hidden" : "md:hidden"} fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white`}>
          {moreOpen && (
            <div className="border-t border-gray-100 bg-white px-4 py-3 space-y-3">
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">作品を上演する</p>
                <div className="grid grid-cols-4 gap-2">
                  <NavLink href="/bookmarks" icon={Heart}>お気に入り</NavLink>
                  <NavLink href="/following" icon={UserPlus}>フォロー</NavLink>
                  <NavLink href="/permissions" icon={FileText}>マイ申請</NavLink>
                  <NavLink href="/threads" icon={MessageCircle}>メッセージ</NavLink>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">作品を書く</p>
                <div className="grid grid-cols-4 gap-2">
                  <NavLink href="/dashboard/plays" icon={BookOpen}>作品</NavLink>
                  <NavLink href="/dashboard/series" icon={Library}>シリーズ</NavLink>
                  <NavLink href="/dashboard/sales" icon={Banknote}>売上</NavLink>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">上演依頼管理</p>
                <div className="grid grid-cols-4 gap-2">
                  <NavLink href="/dashboard/permissions" icon={Inbox}>受信申請</NavLink>
                  <NavLink href="/profile/edit" icon={User}>プロフィール</NavLink>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-around py-2">
            <NavLink href="/dashboard" icon={LayoutDashboard}>
              概要
            </NavLink>
            <NavLink href="/dashboard/plays" icon={BookOpen}>
              書く
            </NavLink>
            <NavLink href="/bookmarks" icon={Heart}>
              上演
            </NavLink>
            <NavLink href="/dashboard/notifications" icon={Bell}>
              通知
            </NavLink>
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="flex flex-col items-center gap-0.5 text-xs text-gray-500"
            >
              {moreOpen ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
              {moreOpen ? "閉じる" : "その他"}
            </button>
          </div>
        </nav>

        {/* メインコンテンツ */}
        <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
