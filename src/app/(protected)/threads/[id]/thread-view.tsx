"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageSquare, Pen, Send } from "lucide-react";
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
 * permission スレッドと inquiry スレッドの両方をレンダリングする。
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

  const isPermission = detail.kind === "permission" && detail.permission;
  const status = detail.permission?.status as PermissionStatus | undefined;
  const isTerminal = !!status && TERMINAL_STATUSES.includes(status);

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
            {isPermission && detail.play ? (
              <>
                <Link
                  href={`/plays/${detail.play.id}`}
                  className="block truncate text-sm font-medium text-gray-900 hover:text-pink-600"
                >
                  {detail.play.title}
                </Link>
                <p className="truncate text-xs text-gray-500">
                  {detail.role === "author" ? "申請者: " : "作家: "}
                  {detail.other.name}
                </p>
              </>
            ) : (
              <>
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-gray-900">
                  <MessageSquare className="h-3.5 w-3.5 text-pink-400" />
                  {detail.other.name}
                </p>
                <p className="truncate text-xs text-gray-500">
                  作家への問い合わせ
                </p>
              </>
            )}
          </div>

          {/* あなたの役割バッジ(permission のみ) */}
          {isPermission && detail.role && (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                detail.role === "author"
                  ? "border-pink-300 bg-pink-50 text-pink-700"
                  : "border-sky-300 bg-sky-50 text-sky-700"
              }`}
              title="あなたの役割"
            >
              {detail.role === "author" ? (
                <>
                  <Pen className="h-3 w-3" />
                  あなた: 執筆者
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  あなた: 申請者
                </>
              )}
            </span>
          )}

          {status && <PermissionStatusBadge status={status} />}
        </div>
      </header>

      {/* 本体 */}
      <div className="container mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-6 lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          {/* permission スレッドのみ: モバイル折りたたみで企画情報 */}
          {isPermission && (
            <details
              className="mb-4 rounded-lg border border-gray-200 bg-white lg:hidden"
              open
            >
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-700 marker:hidden">
                <span className="flex items-center justify-between">
                  {detail.role === "author"
                    ? "申請者・申請内容を見る"
                    : "申請内容を見る"}
                  <span aria-hidden className="text-gray-400">▾</span>
                </span>
              </summary>
              <div className="border-t border-gray-100 p-2">
                <InfoPanel detail={detail} />
              </div>
            </details>
          )}

          <MessageTimeline
            messages={detail.messages}
            other={{
              name: detail.other.name,
              roleLabel: isPermission
                ? detail.role === "author"
                  ? "申請者"
                  : "執筆者"
                : null,
            }}
          />

          {/* アクション帯：permission スレッドのみ */}
          {isPermission && detail.role === "author" && detail.permission && (
            <AuthorActions permission={detail.permission} onActed={refresh} />
          )}
          {isPermission && detail.role === "applicant" && detail.permission && (
            <ApplicantActions permission={detail.permission} onActed={refresh} />
          )}

          <Composer
            threadId={detail.id}
            disabled={isTerminal}
            onSent={refresh}
          />
        </div>

        {/* インフォパネル (lg以上) — permission スレッドのみ */}
        {isPermission && (
          <aside className="hidden w-80 shrink-0 lg:block">
            <div className="sticky top-32">
              <InfoPanel detail={detail} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
