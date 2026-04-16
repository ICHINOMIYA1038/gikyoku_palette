"use client";

import { useEffect, useRef } from "react";
import {
  Check,
  X,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Send,
  Trash2,
  CheckCheck,
  MessageSquare,
} from "lucide-react";
import type { ThreadMessage } from "@/types/thread";
import type { SystemMessageKind } from "@/types";
import type { LucideIcon } from "lucide-react";

/**
 * タイムライン表示。
 * - system message はセンター揃えの細枠カード
 * - text message は LINE 風吹き出し (自分=pink右、相手=白左)
 * - 日付区切りを自動挿入
 * - 読みやすさ優先：pre-wrap、リンク自動化は今回スコープ外
 */
export function MessageTimeline({ messages }: { messages: ThreadMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50">
          <MessageSquare className="h-6 w-6 text-pink-300" />
        </div>
        <p className="text-sm text-gray-500">メッセージを送信してやりとりを始めましょう</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-4">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const showDate =
          !prev ||
          new Date(m.createdAt).toDateString() !==
            new Date(prev.createdAt).toDateString();
        return (
          <div key={m.id}>
            {showDate && <DateSeparator iso={m.createdAt} />}
            {m.type === "system" ? (
              <SystemCard message={m} />
            ) : (
              <TextBubble message={m} />
            )}
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function DateSeparator({ iso }: { iso: string }) {
  const label = new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div className="my-4 flex justify-center">
      <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500 shadow-sm">
        {label}
      </span>
    </div>
  );
}

function TextBubble({ message }: { message: ThreadMessage }) {
  const time = formatTime(message.createdAt);
  return (
    <div className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${message.isMine ? "order-2" : ""}`}>
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            message.isMine
              ? "rounded-br-md bg-pink-500 text-white"
              : "rounded-bl-md border border-gray-100 bg-white text-gray-800 shadow-sm"
          }`}
        >
          {message.content}
        </div>
        <div
          className={`mt-0.5 flex items-center gap-1 ${
            message.isMine ? "justify-end" : ""
          }`}
        >
          <span className="text-[10px] text-gray-400">{time}</span>
          {message.isMine && message.readAt && (
            <CheckCheck className="h-3 w-3 text-sky-400" />
          )}
        </div>
      </div>
    </div>
  );
}

/** システムメッセージの種類ごとのアイコン＋色＋整形ロジック */
type SystemStyle = {
  icon: LucideIcon;
  color: string; // text color
  bg: string; // background color
};

const SYSTEM_STYLES: Record<SystemMessageKind, SystemStyle> = {
  permission_submitted: { icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
  permission_resubmitted: { icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50" },
  permission_approved: { icon: Check, color: "text-green-600", bg: "bg-green-50" },
  permission_rejected: { icon: X, color: "text-red-600", bg: "bg-red-50" },
  revision_requested: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
  payment_completed: { icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
  permission_withdrawn: { icon: Trash2, color: "text-gray-500", bg: "bg-gray-100" },
};

function SystemCard({ message }: { message: ThreadMessage }) {
  const kind = message.kind ?? "permission_submitted";
  const style = SYSTEM_STYLES[kind] ?? SYSTEM_STYLES.permission_submitted;
  const Icon = style.icon;
  const detail = formatSystemDetail(message);

  return (
    <div className="my-3 flex justify-center">
      <div
        className={`flex max-w-md items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm`}
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.color}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-gray-800">{message.content}</p>
          {detail && <p className="mt-0.5 text-gray-500">{detail}</p>}
          <p className="mt-1 text-[10px] text-gray-400">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatSystemDetail(message: ThreadMessage): string | null {
  const meta = (message.metadata as Record<string, unknown> | null) ?? null;
  if (!meta) return null;
  switch (message.kind) {
    case "permission_rejected":
      return typeof meta.reason === "string" ? `理由: ${meta.reason}` : null;
    case "revision_requested":
      return typeof meta.reason === "string" ? `理由: ${meta.reason}` : null;
    case "permission_approved":
      return typeof meta.permissionNumber === "string"
        ? `許可番号: ${meta.permissionNumber}`
        : null;
    case "payment_completed":
      return typeof meta.permissionNumber === "string"
        ? `許可番号: ${meta.permissionNumber}`
        : null;
    default:
      return null;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}
