"use client";

import { useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import {
  approvePermission,
  rejectPermission,
  requestRevision,
} from "@/actions/permissions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PermissionInThread } from "@/types/thread";

type Props = {
  permission: PermissionInThread;
  onActed: () => void;
};

type Mode = "idle" | "approve" | "reject" | "revision";

/**
 * 作家のアクションバー（タイムライン直下に表示）。
 * - status=pending          : 承認 / 修正依頼 / 却下 が選べる
 * - status=revision_requested: 承認 / 却下のみ（修正依頼は重ねない）
 *
 * いずれの操作も任意のメッセージを添えられ、確定すると system message が
 * スレッドに刻まれる。
 */
export function AuthorActions({ permission, onActed }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [payoutBankInfo, setPayoutBankInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRevise = permission.status === "pending";
  const canAct = ["pending", "revision_requested"].includes(permission.status);
  const isPaid = permission.feeAmount > 0;
  if (!canAct) return null;

  const reset = () => {
    setMode("idle");
    setMessage("");
    setReason("");
    setPayoutBankInfo("");
    setError(null);
  };

  const handle = async () => {
    setSubmitting(true);
    setError(null);
    let res:
      | { success?: boolean; error?: string }
      | { success: true }
      | { error: string };
    if (mode === "approve") {
      if (isPaid && !payoutBankInfo.trim()) {
        setError("有料案件では振込先情報の入力が必須です");
        setSubmitting(false);
        return;
      }
      res = await approvePermission(permission.id, {
        message: message || undefined,
        payoutBankInfo: isPaid ? payoutBankInfo : undefined,
      });
    } else if (mode === "reject") {
      if (!reason.trim()) {
        setError("却下理由を入力してください");
        setSubmitting(false);
        return;
      }
      res = await rejectPermission(permission.id, reason, message || undefined);
    } else if (mode === "revision") {
      if (!reason.trim()) {
        setError("修正依頼の理由を入力してください");
        setSubmitting(false);
        return;
      }
      res = await requestRevision(permission.id, reason, message || undefined);
    } else {
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    reset();
    onActed();
  };

  if (mode === "idle") {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="mr-auto text-sm text-amber-800">
          {permission.status === "pending"
            ? "この申請は審査待ちです。"
            : "修正版の再審査をお願いします。"}
        </p>
        <Button type="button" size="sm" className="gap-1.5" onClick={() => setMode("approve")}>
          <Check className="h-3.5 w-3.5" />
          承認
        </Button>
        {canRevise && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 text-orange-600 hover:text-orange-700"
            onClick={() => setMode("revision")}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            修正依頼
          </Button>
        )}
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

  const title =
    mode === "approve"
      ? "申請を承認する"
      : mode === "reject"
        ? "申請を却下する"
        : "修正を依頼する";
  const reasonLabel = mode === "reject" ? "却下理由 *" : "修正してほしい点 *";
  const submitLabel =
    mode === "approve"
      ? "承認を確定"
      : mode === "reject"
        ? "却下を確定"
        : "修正依頼を送る";

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">{title}</p>

      {(mode === "reject" || mode === "revision") && (
        <div>
          <label className="mb-1 block text-xs text-gray-500">{reasonLabel}</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              mode === "reject"
                ? "却下の理由を入力してください（申請者に通知されます）"
                : "修正してほしい点を具体的に伝えてください"
            }
            rows={3}
            required
          />
        </div>
      )}

      {mode === "approve" && isPaid && (
        <div>
          <label className="mb-1 block text-xs text-gray-500">
            振込先情報 *
          </label>
          <Textarea
            value={payoutBankInfo}
            onChange={(e) => setPayoutBankInfo(e.target.value)}
            placeholder={`例:\n○○銀行 △△支店\n普通 1234567\nメイギ タロウ`}
            rows={5}
            required
          />
          <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
            申請者に表示されます。戯曲パレットは決済に関与しないため、
            申請者は表示された口座へ直接振込を行います。
          </p>
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
        <Button type="button" size="sm" disabled={submitting} onClick={handle}>
          {submitting ? "処理中..." : submitLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={submitting}
          onClick={reset}
        >
          戻る
        </Button>
      </div>
    </div>
  );
}
