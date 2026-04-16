"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MessageTimeline } from "./message-timeline";
import { Composer } from "./composer";
import { InfoPanel } from "./info-panel";
import { AuthorActions } from "./author-actions";
import { ApplicantActions } from "./applicant-actions";
import type { ThreadDetail } from "@/types/thread";
import type { PermissionStatus } from "@/types";
import { PermissionStatusBadge } from "@/components/permissions/status-badge";

const POLL_INTERVAL_MS = 5_000;
const TERMINAL_STATUSES: PermissionStatus[] = ["rejected", "withdrawn", "expired"];

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
  const isTerminal = TERMINAL_STATUSES.includes(status);

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
          <PermissionStatusBadge status={status} />
        </div>
      </header>

      {/* 本体: タイムライン + インフォパネル */}
      <div className="container mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-6 lg:flex-row">
        {/* タイムライン */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* mobile only: 企画詳細を折りたたみで露出 */}
          <details className="mb-4 rounded-lg border border-gray-200 bg-white lg:hidden">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-700 marker:hidden">
              <span className="flex items-center justify-between">
                企画情報を見る
                <span aria-hidden className="text-gray-400 transition-transform [details[open]_&]:rotate-180">▾</span>
              </span>
            </summary>
            <div className="border-t border-gray-100 p-2">
              <InfoPanel detail={detail} />
            </div>
          </details>

          <MessageTimeline messages={detail.messages} />
          {/* アクション帯：作家には承認系、申請者には取り下げ・再提出 */}
          {role === "author" && (
            <AuthorActions permission={detail.permission} onActed={refresh} />
          )}
          {role === "applicant" && (
            <ApplicantActions permission={detail.permission} onActed={refresh} />
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

