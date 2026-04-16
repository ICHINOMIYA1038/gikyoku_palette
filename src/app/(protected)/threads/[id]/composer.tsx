"use client";

import { useState, useRef } from "react";
import { Send, Paperclip, X, Loader2 } from "lucide-react";
import { sendMessage } from "@/actions/threads";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_PER_MESSAGE,
  ATTACHMENT_MAX_TOTAL_BYTES_PER_MESSAGE,
  formatBytes,
  validateAttachment,
} from "@/lib/attachment-policy";

type PendingAttachment = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

type Props = {
  threadId: string;
  disabled?: boolean;
  onSent?: () => void;
};

/**
 * メッセージ入力欄。テキスト + 添付ファイル送信に対応。
 *
 * UX:
 * - 📎 で複数選択。アップロード中はスピナー表示
 * - アップロード済みの未送信添付はチップで列挙、× で取消
 * - Ctrl/Cmd+Enter で送信
 * - ファイルなし & テキスト空 では送信不可
 */
export function Composer({ threadId, disabled, onSent }: Props) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalBytes = pending.reduce((sum, p) => sum + p.fileSize, 0);
  const canSend = !sending && !disabled && (value.trim().length > 0 || pending.length > 0);

  const handlePickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = ""; // 同じファイル再選択用にリセット
    setError(null);

    if (pending.length + files.length > ATTACHMENT_MAX_PER_MESSAGE) {
      setError(`1メッセージあたり最大${ATTACHMENT_MAX_PER_MESSAGE}ファイルです`);
      return;
    }

    // クライアント側 validation
    for (const file of files) {
      const v = validateAttachment({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      if (!v.ok) {
        setError(`${file.name}: ${v.reason}`);
        return;
      }
    }
    if (totalBytes + files.reduce((s, f) => s + f.size, 0) > ATTACHMENT_MAX_TOTAL_BYTES_PER_MESSAGE) {
      setError(`合計サイズが上限（${formatBytes(ATTACHMENT_MAX_TOTAL_BYTES_PER_MESSAGE)}）を超えています`);
      return;
    }

    setUploading(true);
    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("threadId", threadId);
          const res = await fetch("/api/upload/attachment", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "アップロードに失敗しました");
          }
          return (await res.json()) as PendingAttachment;
        })
      );
      setPending((prev) => [...prev, ...uploads]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (attachmentId: string) => {
    setPending((prev) => prev.filter((p) => p.id !== attachmentId));
    // ベストエフォートで削除（5分以内なので成功するはず）
    void fetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    const res = await sendMessage(
      threadId,
      value,
      pending.map((p) => p.id)
    );
    setSending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setValue("");
    setPending([]);
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

      {/* アップロード済み添付チップ */}
      {pending.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {pending.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3 text-gray-400" />
              <span className="max-w-[160px] truncate text-gray-700">
                {p.fileName}
              </span>
              <span className="text-gray-400">{formatBytes(p.fileSize)}</span>
              <button
                type="button"
                onClick={() => handleRemove(p.id)}
                className="ml-1 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                aria-label={`${p.fileName} を削除`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sending || pending.length >= ATTACHMENT_MAX_PER_MESSAGE}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:bg-gray-50 hover:text-pink-500 disabled:opacity-50"
          aria-label="ファイルを添付"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          multiple
          hidden
          onChange={handlePickFiles}
        />

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
          disabled={!canSend}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
            canSend
              ? "bg-pink-500 text-white hover:bg-pink-600"
              : "bg-gray-200 text-gray-400"
          }`}
          aria-label="送信"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
      <p className="mt-1 text-right text-[10px] text-gray-400">
        Ctrl + Enter で送信
      </p>
    </div>
  );
}
