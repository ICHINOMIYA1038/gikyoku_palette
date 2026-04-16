import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Send,
  Check,
  X,
  AlertCircle,
  DollarSign,
  Trash2,
  MessageSquare,
  Clock,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getNotifications, markAllAsRead } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { NotificationType } from "@/types";

export const metadata = { title: "通知" };
export const dynamic = "force-dynamic";

type IconStyle = { icon: LucideIcon; color: string; bg: string };

const TYPE_STYLES: Record<NotificationType, IconStyle> = {
  new_application: { icon: Send, color: "text-sky-600", bg: "bg-sky-50" },
  approved: { icon: Check, color: "text-emerald-600", bg: "bg-emerald-50" },
  rejected: { icon: X, color: "text-rose-600", bg: "bg-rose-50" },
  payment_completed: { icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  permission_expired: { icon: Clock, color: "text-zinc-500", bg: "bg-zinc-100" },
  revision_requested: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
  permission_withdrawn: { icon: Trash2, color: "text-slate-500", bg: "bg-slate-100" },
  new_message: { icon: MessageSquare, color: "text-pink-600", bg: "bg-pink-50" },
  new_play_published: { icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50" },
};
const FALLBACK_STYLE: IconStyle = { icon: Bell, color: "text-gray-400", bg: "bg-gray-100" };

export default async function NotificationsPage() {
  const notifications = await getNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-serif font-bold text-gray-900">
          <Bell className="h-6 w-6 text-pink-500" />
          通知
        </h1>
        {unreadCount > 0 && (
          <form action={markAllAsRead}>
            <Button
              variant="outline"
              size="sm"
              type="submit"
              className="gap-1.5 text-gray-600"
            >
              <CheckCheck className="h-4 w-4" />
              すべて既読にする
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-lg border border-gray-200 py-16 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-gray-500">通知はありません</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
          {notifications.map((n) => {
            const style = TYPE_STYLES[n.type as NotificationType] ?? FALLBACK_STYLE;
            const Icon = style.icon;
            const href = n.threadId ? `/threads/${n.threadId}` : null;

            const Body = (
              <div
                className={`flex items-start gap-3 p-4 transition-colors ${
                  href ? "hover:bg-gray-50" : ""
                } ${n.isRead ? "opacity-60" : ""}`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.color}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900">
                      {!n.isRead && (
                        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-pink-500 align-middle" />
                      )}
                      {n.title}
                    </p>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{n.message}</p>
                </div>
              </div>
            );

            return (
              <li key={n.id}>
                {href ? <Link href={href}>{Body}</Link> : Body}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
