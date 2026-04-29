"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Library,
  ShieldCheck,
  Banknote,
  Bell,
  User,
  Link2,
  MessageCircle,
  Heart,
  UserPlus,
  MoreHorizontal,
  X,
} from "lucide-react";
import { NavLink } from "@/components/dashboard/nav-link";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="flex gap-8">
        {/* サイドナビ (md以上) */}
        <nav className="hidden md:block w-48 shrink-0">
          <div className="sticky top-28 space-y-1">
            <NavLink href="/dashboard" icon={LayoutDashboard}>
              概要
            </NavLink>
            <NavLink href="/dashboard/plays" icon={BookOpen}>
              作品管理
            </NavLink>
            <NavLink href="/dashboard/series" icon={Library}>
              シリーズ
            </NavLink>
            <NavLink href="/dashboard/permissions" icon={ShieldCheck}>
              許可申請
            </NavLink>
            <NavLink href="/dashboard/sales" icon={Banknote}>
              売上
            </NavLink>
            <NavLink href="/dashboard/stripe" icon={Link2}>
              Stripe連携
            </NavLink>
            <NavLink href="/dashboard/notifications" icon={Bell}>
              通知
            </NavLink>
            <NavLink href="/threads" icon={MessageCircle}>
              メッセージ
            </NavLink>
            <NavLink href="/bookmarks" icon={Heart}>
              お気に入り
            </NavLink>
            <NavLink href="/following" icon={UserPlus}>
              フォロー
            </NavLink>
            <NavLink href="/profile/edit" icon={User}>
              プロフィール
            </NavLink>
          </div>
        </nav>

        {/* モバイルナビ (md未満) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white">
          {moreOpen && (
            <div className="border-t border-gray-100 bg-white px-4 py-3 grid grid-cols-4 gap-3">
              <NavLink href="/dashboard/series" icon={Library}>
                シリーズ
              </NavLink>
              <NavLink href="/dashboard/sales" icon={Banknote}>
                売上
              </NavLink>
              <NavLink href="/dashboard/stripe" icon={Link2}>
                Stripe
              </NavLink>
              <NavLink href="/threads" icon={MessageCircle}>
                メッセージ
              </NavLink>
              <NavLink href="/bookmarks" icon={Heart}>
                お気に入り
              </NavLink>
              <NavLink href="/following" icon={UserPlus}>
                フォロー
              </NavLink>
              <NavLink href="/profile/edit" icon={User}>
                プロフィール
              </NavLink>
            </div>
          )}
          <div className="flex justify-around py-2">
            <NavLink href="/dashboard" icon={LayoutDashboard}>
              概要
            </NavLink>
            <NavLink href="/dashboard/plays" icon={BookOpen}>
              作品
            </NavLink>
            <NavLink href="/dashboard/permissions" icon={ShieldCheck}>
              申請
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
