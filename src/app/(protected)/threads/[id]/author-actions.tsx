"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { approvePermission, rejectPermission } from "@/actions/permissions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ThreadDetail } from "@/types/thread";

type Props = {
  permission: ThreadDetail["permission"];
  onActed: () => void;
};

/**
 * 作家のアクションバー（タイムライン直下）。
 * - status=pending / revision_requested でのみ表示
 * - 承認：メッセージ任意
 * - 却下：理由必須 + メッセージ任意
 *
 * 「修正依頼」「取り下げ」は Phase 4 で追加予定
 */
export function AuthorActions({ permission, onActed }: Props) {
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAct = ["pending", "revision_requested"].includes(permission.status);
  if (!canAct) return null;

  const handleApprove = async () => {
    setSubmitting(true);
    setError(null);
    const res = await approvePermission(permission.id, message || undefined);
    setSubmitting(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setMode("idle");
    setMessage("");
    onActed();
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setError("却下理由を入力してください");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await rejectPermission(
      permission.id,
      reason,
      message || undefined
    );
    setSubmitting(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setMode("idle");
    setReason("");
    setMessage("");
    onActed();
  };

  if (mode === "idle") {
    return (
      <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="flex-1 text-sm text-amber-800">この申請は審査待ちです。</p>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => setMode("approve")}
        >
          <Check className="h-3.5 w-3.5" />
          承認
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 text-red-600 hover:text-red-700"
          onClick={() => setMode("reject")}
        >
          <X className="h-3.5 w-3.5" />
          却下
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">
        {mode === "approve" ? "申請を承認する" : "申請を却下する"}
      </p>

      {mode === "reject" && (
        <div>
          <label className="mb-1 block text-xs text-gray-500">却下理由 *</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="却下の理由を入力してください（申請者に通知されます）"
            rows={3}
            required
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs text-gray-500">
          メッセージ（任意）
        </label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="申請者へのコメントを入力できます"
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={submitting}
          onClick={mode === "approve" ? handleApprove : handleReject}
        >
          {submitting
            ? "処理中..."
            : mode === "approve"
              ? "承認を確定"
              : "却下を確定"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={submitting}
          onClick={() => {
            setMode("idle");
            setError(null);
          }}
        >
          戻る
        </Button>
      </div>
    </div>
  );
}
