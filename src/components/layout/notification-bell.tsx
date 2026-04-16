/**
 * グローバルヘッダー右側に置く通知ベル。
 * ログイン中のユーザーの未読数をサーバ側で取得し、>0 の時に
 * 赤いドット（と件数バッジ）を表示する。
 */

import Link from "next/link";
import { Bell } from "lucide-react";
import { getUnreadCount } from "@/actions/notifications";

export async function NotificationBell() {
  const count = await getUnreadCount();
  const hasUnread = count > 0;

  return (
    <Link
      href="/dashboard/notifications"
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
      aria-label={hasUnread ? `通知 ${count}件未読` : "通知"}
    >
      <Bell className="h-4 w-4" />
      {hasUnread && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
