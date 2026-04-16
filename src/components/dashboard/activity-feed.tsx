/**
 * 直近活動フィード。申請 / レビュー / フォロー / 決済 を時系列で混合表示。
 */

import Link from "next/link";
import {
  Send,
  Star,
  UserPlus,
  DollarSign,
  type LucideIcon,
} from "lucide-react";
import type { Activity } from "@/actions/dashboard";

const STYLES: Record<
  Activity["kind"],
  { icon: LucideIcon; color: string; bg: string }
> = {
  permission: { icon: Send, color: "text-sky-600", bg: "bg-sky-50" },
  review: { icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
  follow: { icon: UserPlus, color: "text-pink-600", bg: "bg-pink-50" },
  payment: { icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
};

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <p className="text-center text-xs text-gray-400 py-8">
        まだ活動はありません。作品を公開すると申請やレビューが届きます。
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {activities.map((a) => {
        const s = STYLES[a.kind];
        const Icon = s.icon;
        const Body = (
          <div className="flex items-start gap-3 py-3">
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${s.bg} ${s.color}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{a.title}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500">{a.detail}</p>
            </div>
            <time className="shrink-0 text-[10px] text-gray-400">
              {formatRelative(a.createdAt)}
            </time>
          </div>
        );
        return (
          <li key={a.id}>
            {a.href ? (
              <Link href={a.href} className="block hover:bg-gray-50 px-1">
                {Body}
              </Link>
            ) : (
              <div className="px-1">{Body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((now - then) / 60_000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}
