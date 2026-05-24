"use client";

import { useState } from "react";
import { Banknote, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportTransfer, confirmTransfer } from "@/actions/permissions";
import { formatCurrency } from "@/lib/utils";

type Props = {
  permissionId: string;
  feeAmount: number;
  expiresAt: string | null;
  payoutBankInfo: string | null;
  status: "approved" | "paid";
  role: "applicant" | "author";
  transferReportedAt: string | null;
};

/**
 * 当事者間直接振込モデルの操作パネル。
 *   approved + applicant → 振込先表示 + 「振込しました」ボタン
 *   approved + author    → 振込報告待ち表示
 *   paid     + applicant → 入金確認待ち表示
 *   paid     + author    → 「入金を確認しました」ボタン
 */
export function TransferPanel({
  permissionId,
  feeAmount,
  expiresAt,
  payoutBankInfo,
  status,
  role,
  transferReportedAt,
}: Props) {
  const [confirmMessage, setConfirmMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReport = async () => {
    if (!window.confirm("振込が完了したことを作家に報告します。よろしいですか？")) return;
    setLoading(true);
    setError(null);
    const res = await reportTransfer(permissionId);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    window.location.reload();
  };

  const handleConfirm = async () => {
    if (!window.confirm("入金を確認し、許可証を発行します。よろしいですか？")) return;
    setLoading(true);
    setError(null);
    const res = await confirmTransfer(permissionId, confirmMessage || undefined);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    window.location.reload();
  };

  const handleCopy = async () => {
    if (!payoutBankInfo) return;
    await navigator.clipboard.writeText(payoutBankInfo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // === 申請者視点 ===
  if (role === "applicant") {
    if (status === "approved") {
      return (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-700">
              上演料 {formatCurrency(feeAmount)} を以下へお振込みください
            </p>
            {expiresAt && (
              <p className="text-[11px] text-gray-500">
                期日: {formatExpire(expiresAt)}
              </p>
            )}
          </div>
          {payoutBankInfo && (
            <div className="rounded-md border border-gray-200 bg-white p-3">
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-800">
                {payoutBankInfo}
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                className="mt-2 inline-flex h-9 items-center gap-1 rounded-md px-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" /> コピーしました
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> 振込先をコピー
                  </>
                )}
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button
            size="sm"
            className="h-11 w-full gap-1.5 sm:h-9"
            onClick={handleReport}
            disabled={loading}
          >
            <Banknote className="h-3.5 w-3.5" />
            {loading ? "送信中..." : "振込しました"}
          </Button>
          <p className="text-[10px] leading-relaxed text-gray-500">
            ※ 戯曲パレットは決済に関与しません。振込は当事者間で直接行ってください。
          </p>
        </div>
      );
    }
    // status = paid
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3">
        <p className="text-xs font-medium text-blue-900">
          振込報告を送信しました
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-blue-800">
          作家が入金を確認次第、許可証が発行されます。
          {transferReportedAt && ` (報告: ${formatExpire(transferReportedAt)})`}
        </p>
      </div>
    );
  }

  // === 作家視点 ===
  if (status === "approved") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
        <p className="text-xs font-medium text-amber-900">
          申請者の振込待ち
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
          提示した振込先への入金後、申請者から振込報告が届きます。
          すでに入金確認済みの場合は、下のボタンで直接許可証を発行できます。
        </p>
        <div className="mt-3">
          <Textarea
            value={confirmMessage}
            onChange={(e) => setConfirmMessage(e.target.value)}
            placeholder="申請者へのメッセージ（任意）"
            rows={2}
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          <Button
            size="sm"
            variant="outline"
            className="mt-2 h-11 w-full gap-1.5 sm:h-9"
            onClick={handleConfirm}
            disabled={loading}
          >
            <Check className="h-3.5 w-3.5" />
            {loading ? "処理中..." : "入金確認・許可証を発行"}
          </Button>
        </div>
      </div>
    );
  }
  // status = paid
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-700">
        申請者が振込完了を報告しました
      </p>
      {transferReportedAt && (
        <p className="text-[11px] text-gray-500">
          報告日時: {formatExpire(transferReportedAt)}
        </p>
      )}
      <Textarea
        value={confirmMessage}
        onChange={(e) => setConfirmMessage(e.target.value)}
        placeholder="申請者へのメッセージ（任意）"
        rows={2}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Button
        size="sm"
        className="h-11 w-full gap-1.5 sm:h-9"
        onClick={handleConfirm}
        disabled={loading}
      >
        <Check className="h-3.5 w-3.5" />
        {loading ? "発行中..." : "入金を確認し許可証を発行"}
      </Button>
    </div>
  );
}

function formatExpire(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}
