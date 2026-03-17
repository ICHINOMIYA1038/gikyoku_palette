"use client";

import { useState } from "react";
import { createExpressAccount, createAccountLink } from "@/lib/stripe/actions";
import { Button } from "@/components/ui/button";

export function StripeConnectButton({ hasAccount }: { hasAccount: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!hasAccount) {
        await createExpressAccount();
      }

      const result = await createAccountLink();
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <Button onClick={handleConnect} disabled={loading}>
        {loading
          ? "処理中..."
          : hasAccount
            ? "Stripe連携を続ける"
            : "Stripeアカウントを連携する"}
      </Button>
    </div>
  );
}
