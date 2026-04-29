import Link from "next/link";
import Image from "next/image";
import { MessageCircle, MessageSquare, Inbox, Send, HelpCircle } from "lucide-react";
import { getMyThreads } from "@/actions/threads";
import { PermissionStatusBadge } from "@/components/permissions/status-badge";
import type { ThreadSummary } from "@/types/thread";

export const metadata = { title: "メッセージ" };
export const dynamic = "force-dynamic";

type Tab = "all" | "received" | "sent" | "inquiry";

type TabDef = {
  key: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (t: ThreadSummary) => boolean;
};

const TABS: TabDef[] = [
  {
    key: "all",
    label: "すべて",
    icon: MessageCircle,
    match: () => true,
  },
  {
    key: "received",
    label: "受信した申請",
    icon: Inbox,
    match: (t) => t.kind === "permission" && t.role === "author",
  },
  {
    key: "sent",
    label: "送信した申請",
    icon: Send,
    match: (t) => t.kind === "permission" && t.role === "applicant",
  },
  {
    key: "inquiry",
    label: "問い合わせ",
    icon: HelpCircle,
    match: (t) => t.kind === "inquiry",
  },
];

/**
 * スレッド（申請）一覧ページ。
 * 立場別にタブでフィルタできる。URL param `tab` で deep link 可能。
 */
export default async function ThreadsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = (TABS.some((t) => t.key === tabParam) ? tabParam : "all") as Tab;

  const threads = await getMyThreads();

  const matcher = TABS.find((t) => t.key === tab)!.match;
  const filtered = threads.filter(matcher);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-serif font-bold text-gray-900">
        <MessageCircle className="h-6 w-6 text-pink-500" />
        メッセージ
      </h1>

      {/* Tabs */}
      <div className="mb-6 -mx-4 overflow-x-auto scrollbar-hide px-4">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
          {TABS.map((t) => {
            const items = threads.filter(t.match);
            const count = items.length;
            const unread = items.reduce((acc, x) => acc + x.unread, 0);
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <Link
                key={t.key}
                href={t.key === "all" ? "/threads" : `/threads?tab=${t.key}`}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {count > 0 && (
                  <span
                    className={`ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      unread > 0
                        ? "bg-pink-500 text-white"
                        : active
                        ? "bg-gray-100 text-gray-600"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {unread > 0 ? unread : count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 py-16 text-center">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-gray-500">
            {tab === "all"
              ? "スレッドはまだありません"
              : tab === "received"
              ? "受信した申請はまだありません"
              : tab === "sent"
              ? "送信した申請はまだありません"
              : "問い合わせスレッドはまだありません"}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {tab === "sent"
              ? "作品ページから上演申請すると、ここに表示されます"
              : tab === "received"
              ? "あなたの作品に申請が届くと、ここに表示されます"
              : tab === "inquiry"
              ? "作品ページから作家に問い合わせると、ここに表示されます"
              : "作品を上演申請すると、申請ごとにスレッドが作られます"}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
          {filtered.map((t) => (
            <li key={t.id}>
              <Link
                href={`/threads/${t.id}`}
                className="block p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  {/* 左アイコン: 作品カバー or 問い合わせアイコン */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-gray-100">
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
                    {/* 役割ミニバッジ(permission のみ) */}
                    {t.kind === "permission" && t.role && (
                      <span
                        className={`absolute -bottom-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full border-2 border-white px-1 text-[9px] font-bold text-white shadow-sm ${
                          t.role === "author" ? "bg-pink-500" : "bg-sky-500"
                        }`}
                        title={t.role === "author" ? "執筆者として受信" : "申請者として送信"}
                      >
                        {t.role === "author" ? "受" : "送"}
                      </span>
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
                            {t.role === "author" ? "申請者" : "執筆者"}
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
