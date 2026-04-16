import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { getNotifications, markAllAsRead } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "通知" };

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-gray-900">通知</h1>
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
        <div className="text-center py-16">
          <Bell className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">通知はありません。</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border border-gray-200 p-4 ${
                notification.isRead ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {!notification.isRead && (
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-pink-400" />
                    )}
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {notification.message}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-400 ml-4">
                  {formatDate(notification.createdAt)}
                </span>
              </div>
              {notification.permissionId && (
                <Link
                  href={`/permissions/${notification.permissionId}`}
                  className="mt-2 inline-block text-sm text-pink-600 hover:text-pink-700 hover:underline transition-colors"
                >
                  詳細を見る
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
