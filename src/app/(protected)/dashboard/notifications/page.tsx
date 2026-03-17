import Link from "next/link";
import { getNotifications, markAllAsRead } from "@/actions/notifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "通知" };

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">通知</h1>
        {unreadCount > 0 && (
          <form action={markAllAsRead}>
            <Button variant="outline" size="sm" type="submit">
              すべて既読にする
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-muted-foreground">通知はありません。</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.isRead ? "opacity-60" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {!notification.isRead && (
                        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary" />
                      )}
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(notification.createdAt)}
                  </span>
                </div>
                {notification.permissionId && (
                  <Link
                    href={`/permissions/${notification.permissionId}`}
                    className="mt-2 inline-block text-sm text-primary hover:underline"
                  >
                    詳細を見る →
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
