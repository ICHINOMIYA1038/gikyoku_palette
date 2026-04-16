"use client";

import {
  LayoutDashboard,
  BookOpen,
  ShieldCheck,
  Banknote,
  Bell,
  User,
  Link2,
  MessageCircle,
} from "lucide-react";
import { NavLink } from "@/components/dashboard/nav-link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="flex gap-8">
        {/* サイドナビ (lg以上) */}
        <nav className="hidden lg:block w-48 shrink-0">
          <div className="sticky top-20 space-y-1">
            <NavLink href="/dashboard" icon={LayoutDashboard}>
              概要
            </NavLink>
            <NavLink href="/dashboard/plays" icon={BookOpen}>
              作品管理
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
            <NavLink href="/profile/edit" icon={User}>
              プロフィール
            </NavLink>
          </div>
        </nav>

        {/* モバイルナビ (lg未満) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white">
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
          </div>
        </nav>

        {/* メインコンテンツ */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
