import Link from "next/link";
import {
  BookOpen,
  Eye,
  FileText,
  Banknote,
  Plus,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Heart,
  UserPlus,
  Activity as ActivityIcon,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getDashboardSummary, getDashboardAnalytics } from "@/actions/dashboard";
import { formatCurrency } from "@/lib/utils";
import { BarChart } from "@/components/dashboard/bar-chart";
import { HorizontalBarList } from "@/components/dashboard/horizontal-bar-list";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export const metadata = { title: "ダッシュボード" };
export const dynamic = "force-dynamic";

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-400" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {value}
        {suffix && <span className="ml-0.5 text-sm font-medium text-gray-400">{suffix}</span>}
      </p>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
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
      className="group rounded-lg border border-gray-200 p-5 transition-all hover:border-gray-300 hover:shadow-sm"
    >
      <Icon className="mb-3 h-5 w-5 text-gray-400 transition-colors group-hover:text-gray-600" />
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
    </Link>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 p-5">
      <header className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-medium text-gray-900">{title}</h2>
      </header>
      <div>{children}</div>
      {footer && <div className="mt-3 border-t border-gray-100 pt-3 text-xs">{footer}</div>}
    </section>
  );
}

export default async function DashboardPage() {
  const [summary, analytics] = await Promise.all([
    getDashboardSummary(),
    getDashboardAnalytics(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-2xl font-serif font-bold text-gray-900">
        ダッシュボード
      </h1>

      {/* Stripe 警告 */}
      {summary.paidPublishedCount > 0 && !summary.stripeReady && (
        <Link
          href="/dashboard/stripe"
          className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              Stripe 連携が必要です
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              有料作品が {summary.paidPublishedCount} 件公開中ですが、Stripe Connect が
              未連携のため申請者からの決済を受け取れません。
            </p>
          </div>
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
        </Link>
      )}

      {/* 統計カード */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="公開作品" value={summary.publishedPlays} suffix="作" />
        <StatCard
          icon={Eye}
          label="累計閲覧数"
          value={summary.totalViews.toLocaleString()}
          suffix="回"
        />
        <StatCard
          icon={FileText}
          label="審査中の申請"
          value={summary.pendingApplications}
          suffix="件"
          hint={summary.pendingApplications > 0 ? "対応をお願いします" : undefined}
        />
        <StatCard
          icon={Banknote}
          label="今月の売上"
          value={formatCurrency(summary.monthlyRevenue)}
        />
        <StatCard
          icon={UserPlus}
          label="フォロワー"
          value={analytics.followerCount.toLocaleString()}
        />
        <StatCard
          icon={Heart}
          label="累計お気に入り"
          value={analytics.bookmarkCount.toLocaleString()}
        />
      </div>

      {/* 分析: 申請推移 / 月別売上 / TOP作品 / 直近活動 */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Panel icon={ActivityIcon} title="申請数（直近30日）">
          <BarChart
            data={analytics.permissionsByDay.map((d) => ({
              label: d.date.slice(5),
              value: d.value,
            }))}
            colorClass="text-sky-400"
            format={(v) => `${v} 件`}
            showLatestLabel
          />
          <p className="mt-3 text-xs text-gray-500">
            合計{" "}
            <span className="font-medium text-gray-800">
              {analytics.permissionsByDay.reduce((s, d) => s + d.value, 0)}
            </span>{" "}
            件
          </p>
        </Panel>

        <Panel icon={TrendingUp} title="月別売上（直近6ヶ月）">
          <BarChart
            data={analytics.revenueByMonth.map((d) => ({
              label: d.month,
              value: d.value,
            }))}
            colorClass="text-emerald-400"
            format={(v) => formatCurrency(v)}
            showLatestLabel
          />
          <p className="mt-3 text-xs text-gray-500">
            合計{" "}
            <span className="font-medium text-gray-800">
              {formatCurrency(
                analytics.revenueByMonth.reduce((s, d) => s + d.value, 0)
              )}
            </span>
          </p>
        </Panel>

        <Panel icon={BookOpen} title="閲覧数 TOP 作品">
          <HorizontalBarList
            items={analytics.topPlays.map((p) => ({
              id: p.id,
              label: p.title,
              value: p.viewCount,
              meta:
                p.reviewCount > 0
                  ? `★${p.avgRating.toFixed(1)} (${p.reviewCount})`
                  : undefined,
              href: `/plays/${p.id}`,
            }))}
            format={(v) => `${v.toLocaleString()} 回`}
            emptyText="まだ公開作品がありません"
          />
        </Panel>

        <Panel icon={ActivityIcon} title="最近の活動">
          <ActivityFeed activities={analytics.activities} />
        </Panel>
      </div>

      {/* クイックアクション */}
      <div className="grid gap-4 sm:grid-cols-3">
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
