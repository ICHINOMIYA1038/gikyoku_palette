"use client";

import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { sendMessage } from "@/actions/threads";

type Props = {
  threadId: string;
  disabled?: boolean;
  onSent?: () => void;
};

/**
 * メッセージ入力欄。
 * - Ctrl/Cmd+Enter で送信
 * - disabled時は終了理由を表示
 * - 送信後は onSent でポーリングを即時トリガー
 *
 * 添付ファイル対応は Phase 3 で追加予定
 */
export function Composer({ threadId, disabled, onSent }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    setError(null);
    const res = await sendMessage(threadId, trimmed);
    setSending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setValue("");
    onSent?.();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (disabled) {
    return (
      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-500">
        このスレッドは終了したため、メッセージを送信できません
      </div>
    );
  }

  return (
    <div className="mt-4">
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
          }}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2.5 text-sm leading-relaxed focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
          style={{ maxHeight: "140px" }}
          disabled={sending}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !value.trim()}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
            sending || !value.trim()
              ? "bg-gray-200 text-gray-400"
              : "bg-pink-500 text-white hover:bg-pink-600"
          }`}
          aria-label="送信"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-right text-[10px] text-gray-400">
        Ctrl+Enter で送信
      </p>
    </div>
  );
}
