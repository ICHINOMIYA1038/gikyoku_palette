"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MessageTimeline } from "./message-timeline";
import { Composer } from "./composer";
import { InfoPanel } from "./info-panel";
import { AuthorActions } from "./author-actions";
import type { ThreadDetail } from "@/types/thread";
import { PERMISSION_STATUS_LABELS } from "@/types";
import type { PermissionStatus } from "@/types";

const POLL_INTERVAL_MS = 5_000;

/**
 * スレッド画面のクライアントルート。
 *
 * - 初期データはサーバから渡される（getThreadDetail で既読化済み）
 * - 5秒ポーリングで最新の detail を取り直す（メッセージ差分も含む）
 * - 送信は server action（composer内）→ ポーリングで反映
 */
export function ThreadView({ initial }: { initial: ThreadDetail }) {
  const [detail, setDetail] = useState<ThreadDetail>(initial);
  const isActive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/threads/${initial.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as ThreadDetail;
      if (isActive.current) setDetail(next);
    } catch {
      /* ignore network flakes */
    }
  }, [initial.id]);

  useEffect(() => {
    isActive.current = true;
    const t = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      isActive.current = false;
      clearInterval(t);
    };
  }, [refresh]);

  const { role, other, play, permission } = detail;
  const status = permission.status as PermissionStatus;
  const isTerminal = ["rejected", "withdrawn", "expired"].includes(status);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      {/* ヘッダー */}
      <header className="sticky top-16 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="container mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href="/threads"
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="スレッド一覧へ戻る"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/plays/${play.id}`}
              className="block truncate text-sm font-medium text-gray-900 hover:text-pink-600"
            >
              {play.title}
            </Link>
            <p className="truncate text-xs text-gray-500">
              {role === "author" ? "申請者: " : "作家: "}
              {other.name}
            </p>
          </div>
          <StatusPill status={status} />
        </div>
      </header>

      {/* 本体: タイムライン + インフォパネル */}
      <div className="container mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-6 lg:flex-row">
        {/* タイムライン */}
        <div className="flex min-h-0 flex-1 flex-col">
          <MessageTimeline messages={detail.messages} />
          {/* 作家アクション（承認/却下） — pending時のみ表示 */}
          {role === "author" && (
            <AuthorActions permission={detail.permission} onActed={refresh} />
          )}
          {/* 入力欄 */}
          <Composer
            threadId={detail.id}
            disabled={isTerminal}
            onSent={refresh}
          />
        </div>

        {/* インフォパネル (lg以上) */}
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-32">
            <InfoPanel detail={detail} />
          </div>
        </aside>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<PermissionStatus, string> = {
  pending: "bg-blue-50 text-blue-700",
  approved: "bg-amber-50 text-amber-700",
  permitted: "bg-green-50 text-green-700",
  rejected: "bg-gray-100 text-gray-500",
  expired: "bg-gray-100 text-gray-500",
  revision_requested: "bg-orange-50 text-orange-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

function StatusPill({ status }: { status: PermissionStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {PERMISSION_STATUS_LABELS[status]}
    </span>
  );
}
