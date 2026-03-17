"use client";

import { useState } from "react";
import { createCheckoutSession } from "@/lib/stripe/actions";
import { Button } from "@/components/ui/button";

export function PaymentButton({ permissionId }: { permissionId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    const result = await createCheckoutSession(permissionId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.url) {
      window.location.href = result.url;
    }
  };

  return (
    <div>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <Button
        onClick={handlePayment}
        disabled={loading}
        size="lg"
        className="w-full"
      >
        {loading ? "処理中..." : "Stripeで支払う"}
      </Button>
    </div>
  );
}
