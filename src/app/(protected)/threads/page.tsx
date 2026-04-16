import Link from "next/link";
import Image from "next/image";
import { MessageCircle, MessageSquare } from "lucide-react";
import { getMyThreads } from "@/actions/threads";
import { PermissionStatusBadge } from "@/components/permissions/status-badge";

export const metadata = { title: "メッセージ" };
export const dynamic = "force-dynamic";

/**
 * スレッド（申請）一覧ページ。
 * 作家・申請者どちらの立場のスレッドも混在で表示。
 */
export default async function ThreadsPage() {
  const threads = await getMyThreads();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 flex items-center gap-2 text-2xl font-serif font-bold text-gray-900">
        <MessageCircle className="h-6 w-6 text-pink-500" />
        メッセージ
      </h1>

      {threads.length === 0 ? (
        <div className="rounded-lg border border-gray-200 py-16 text-center">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-gray-500">スレッドはまだありません</p>
          <p className="mt-1 text-xs text-gray-400">
            作品を上演申請すると、申請ごとにスレッドが作られます
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/threads/${t.id}`}
                className="block p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  {/* 左アイコン: 作品カバー or 問い合わせアイコン */}
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-gray-100">
                    {t.kind === "permission" && t.play?.coverImageUrl ? (
                      <Image
                        src={t.play.coverImageUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    ) : t.kind === "permission" && t.play ? (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        {t.play.title.slice(0, 1)}
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-pink-50">
                        <MessageSquare className="h-5 w-5 text-pink-300" />
                      </div>
                    )}
                  </div>

                  {/* 本文 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {t.kind === "permission" && t.play ? (
                        <>
                          <p className="truncate text-sm font-medium text-gray-900">
                            {t.play.title}
                          </p>
                          {t.permission && (
                            <PermissionStatusBadge
                              status={t.permission.status}
                              size="sm"
                            />
                          )}
                        </>
                      ) : (
                        <p className="truncate text-sm font-medium text-gray-900">
                          {t.other.name}
                        </p>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      {t.kind === "permission" ? (
                        <>
                          <span className="text-gray-400">
                            {t.role === "author" ? "申請者" : "作家"}
                          </span>
                          <span className="truncate">{t.other.name}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">問い合わせ</span>
                      )}
                    </p>
                    <p className="mt-1 truncate text-sm text-gray-500">
                      {t.lastMessage || "（メッセージなし）"}
                    </p>
                  </div>

                  {/* 日付＋未読 */}
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-400">
                      {formatDate(t.lastAt)}
                    </p>
                    {t.unread > 0 && (
                      <span className="mt-1 inline-block rounded-full bg-pink-500 px-2 py-0.5 text-xs font-bold text-white">
                        {t.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}
