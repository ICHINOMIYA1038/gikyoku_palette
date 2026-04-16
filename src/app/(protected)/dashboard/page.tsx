import Link from "next/link";
import {
  BookOpen,
  Eye,
  FileText,
  Banknote,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { getDashboardSummary } from "@/actions/dashboard";
import { formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export const metadata = { title: "ダッシュボード" };

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-gray-400" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {value}
        {suffix}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
    >
      <Icon className="h-5 w-5 text-gray-400 group-hover:text-gray-600 mb-3 transition-colors" />
      <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-8">
        ダッシュボード
      </h1>

      {/* 統計カード */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <StatCard
          icon={BookOpen}
          label="公開作品"
          value={summary.publishedPlays}
        />
        <StatCard
          icon={Eye}
          label="総閲覧数"
          value={summary.totalViews.toLocaleString()}
        />
        <StatCard
          icon={FileText}
          label="申請数"
          value={summary.pendingApplications}
          suffix="件"
        />
        <StatCard
          icon={Banknote}
          label="今月の売上"
          value={formatCurrency(summary.monthlyRevenue)}
        />
      </div>

      {/* クイックアクション */}
      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        <QuickAction
          href="/dashboard/plays/new"
          icon={Plus}
          title="新規投稿"
          desc="新しい作品を投稿する"
        />
        <QuickAction
          href="/dashboard/plays"
          icon={BookOpen}
          title="作品管理"
          desc="作品の編集・公開管理"
        />
        <QuickAction
          href="/dashboard/permissions"
          icon={ShieldCheck}
          title="許可申請"
          desc="上演許可の確認・承認"
        />
      </div>
    </div>
  );
}
