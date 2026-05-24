import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { getMyThreads } from "@/actions/threads";
import { PermissionStatusBadge } from "@/components/permissions/status-badge";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "メッセージ" };
export const dynamic = "force-dynamic";

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

export default async function ThreadsPage() {
  const threads = await getMyThreads();

  if (threads.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-serif font-bold text-gray-900">
          メッセージ
        </h1>
        <div className="rounded-lg border border-dashed border-gray-300 py-20 text-center">
          <MessageCircle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-500">
            まだメッセージはありません。
          </p>
          <p className="mt-1 text-xs text-gray-400">
            上演許可申請を送るか、受け取ると、ここにスレッドが表示されます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-serif font-bold text-gray-900">
        メッセージ
      </h1>

      <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {threads.map((t) => (
          <Link
            key={t.id}
            href={`/threads/${t.id}`}
            className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            {/* avatar */}
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
              {t.other.image ? (
                <Image
                  src={t.other.image}
                  alt={t.other.name}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-400">
                  {t.other.name.slice(0, 1)}
                </div>
              )}
            </div>

            {/* body */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium text-gray-900">
                  {t.other.name}
                  {t.role && (
                    <span className="ml-1.5 text-[10px] text-gray-400">
                      ({t.role === "author" ? "申請" : "執筆者"})
                    </span>
                  )}
                </p>
                <p className="shrink-0 text-[11px] text-gray-400">
                  {formatRelative(t.lastAt)}
                </p>
              </div>

              {t.permission && t.play && (
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="truncate text-xs text-gray-500">
                    {t.play.title}
                  </span>
                  {t.permission.feeAmount > 0 && (
                    <span className="shrink-0 text-[11px] text-gray-400">
                      {formatCurrency(t.permission.feeAmount)}
                    </span>
                  )}
                  <PermissionStatusBadge
                    status={t.permission.status}
                    size="sm"
                  />
                </div>
              )}

              {t.lastMessage && (
                <p className="mt-1 truncate text-xs text-gray-500">
                  {t.lastMessage}
                </p>
              )}
            </div>

            {/* unread badge */}
            {t.unread > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-pink-500 px-1.5 text-[10px] font-semibold text-white">
                {t.unread > 99 ? "99+" : t.unread}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
