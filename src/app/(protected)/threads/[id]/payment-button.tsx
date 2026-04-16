"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/lib/stripe/actions";
import { formatCurrency } from "@/lib/utils";

type Props = {
  permissionId: string;
  feeAmount: number;
  expiresAt: string | null;
  authorStripeReady: boolean;
};

/**
 * 申請者が表示する決済ボタン。
 * - 作家の Stripe 連携が未完なら案内を出す（dev では強制バイパスで動く）
 * - クリック → server action createCheckoutSession → Stripe Checkout へリダイレクト
 */
export function PaymentButton({
  permissionId,
  feeAmount,
  expiresAt,
  authorStripeReady,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    const res = await createCheckoutSession(permissionId);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    if (res.url) {
      window.location.href = res.url;
    } else {
      setError("Checkout URL を取得できませんでした");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        {expiresAt &&
          `${formatExpire(expiresAt)} までに決済してください`}
      </p>

      {!authorStripeReady && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          執筆者の Stripe 連携が完了していません。
          <br />
          {process.env.NODE_ENV === "development"
            ? "（開発環境のため、Connect バイパスで決済可能です）"
            : "完了次第お支払いいただけます。執筆者へお問い合わせください。"}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <Button
        size="sm"
        className="w-full gap-1.5"
        onClick={handlePay}
        disabled={loading || (!authorStripeReady && process.env.NODE_ENV !== "development")}
      >
        <CreditCard className="h-3.5 w-3.5" />
        {loading ? "処理中..." : `${formatCurrency(feeAmount)} を支払う`}
      </Button>
    </div>
  );
}

function formatExpire(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}
