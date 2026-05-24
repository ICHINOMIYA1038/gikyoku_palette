"use client";

import { useEffect, useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import Link from "next/link";
import {
  approvePermission,
  rejectPermission,
  requestRevision,
} from "@/actions/permissions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listPayoutTemplates, type PayoutTemplate } from "@/actions/payout-templates";
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
  const [templates, setTemplates] = useState<PayoutTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRevise = permission.status === "pending";
  const canAct = ["pending", "revision_requested"].includes(permission.status);
  const isPaid = permission.feeAmount > 0;

  // approve モードに入ったときだけテンプレートを取りに行く
  useEffect(() => {
    if (mode !== "approve" || !isPaid) return;
    let cancelled = false;
    (async () => {
      const list = await listPayoutTemplates();
      if (cancelled) return;
      setTemplates(list);
      const def = list.find((t) => t.isDefault) ?? list[0];
      if (def) {
        setSelectedTemplateId(def.id);
        setPayoutBankInfo(def.content);
      } else {
        setSelectedTemplateId("manual");
      }
    })();
    return () => { cancelled = true; };
  }, [mode, isPaid]);

  if (!canAct) return null;

  const reset = () => {
    setMode("idle");
    setMessage("");
    setReason("");
    setPayoutBankInfo("");
    setSelectedTemplateId("");
    setError(null);
  };

  const onSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    if (id === "manual") {
      setPayoutBankInfo("");
    } else {
      const t = templates.find((x) => x.id === id);
      if (t) setPayoutBankInfo(t.content);
    }
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
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="mb-2 text-sm text-amber-800 sm:mb-0">
          {permission.status === "pending"
            ? "この申請は審査待ちです。"
            : "修正版の再審査をお願いします。"}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:mt-0 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
        <Button type="button" size="sm" className="h-10 w-full gap-1.5 sm:w-auto" onClick={() => setMode("approve")}>
          <Check className="h-3.5 w-3.5" />
          承認
        </Button>
        {canRevise && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10 w-full gap-1.5 text-orange-600 hover:text-orange-700 sm:w-auto"
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
          className="h-10 w-full gap-1.5 text-red-600 hover:text-red-700 sm:w-auto"
          onClick={() => setMode("reject")}
        >
          <X className="h-3.5 w-3.5" />
          却下
        </Button>
        </div>
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
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              振込先テンプレート
            </label>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTemplate(t.id)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                    selectedTemplateId === t.id
                      ? "border-pink-400 bg-pink-50 text-pink-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {t.label}
                  {t.isDefault && <span className="ml-1 text-[9px] text-pink-500">★</span>}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onSelectTemplate("manual")}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  selectedTemplateId === "manual"
                    ? "border-pink-400 bg-pink-50 text-pink-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                別途指定
              </button>
            </div>
            {templates.length === 0 && (
              <p className="mt-1 text-[11px] text-gray-500">
                テンプレート未登録。
                <Link href="/profile/edit#payout-templates" className="ml-1 text-pink-600 hover:underline" target="_blank">
                  プロフィール編集で追加
                </Link>
                すると次回から呼び出せます。
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              振込先情報 *
            </label>
            <Textarea
              value={payoutBankInfo}
              onChange={(e) => {
                setPayoutBankInfo(e.target.value);
                setSelectedTemplateId("manual");
              }}
              placeholder={`例:\n○○銀行 △△支店\n普通 1234567\nメイギ タロウ`}
              rows={5}
              required
            />
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
              申請者に表示されます。戯曲パレットは決済に関与しないため、
              申請者は表示された口座へ直接振込を行います。
            </p>
          </div>
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

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button type="button" size="sm" className="h-10 sm:h-8" disabled={submitting} onClick={handle}>
          {submitting ? "処理中..." : submitLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-10 sm:h-8"
          disabled={submitting}
          onClick={reset}
        >
          戻る
        </Button>
      </div>
    </div>
  );
}
