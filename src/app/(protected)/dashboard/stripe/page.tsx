import { createExpressAccount, createAccountLink, getStripeAccountStatus } from "@/lib/stripe/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StripeConnectButton } from "./stripe-connect-button";

export const metadata = { title: "Stripe連携" };

export default async function StripePage() {
  const status = await getStripeAccountStatus();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Stripe連携</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            アカウント連携状況
            <Badge variant={status?.onboardingCompleted ? "default" : "secondary"}>
              {status?.onboardingCompleted ? "連携済み" : status ? "連携未完了" : "未連携"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status?.onboardingCompleted ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Stripeアカウントが正常に連携されています。有料作品の上演料を受け取ることができます。
              </p>
              <p className="text-sm">
                <a
                  href="https://dashboard.stripe.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Stripeダッシュボードを開く →
                </a>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                有料作品の上演料を受け取るには、Stripeアカウントの連携が必要です。
                連携すると、承認した上演許可申請の上演料が自動的にあなたのアカウントに入金されます。
              </p>
              <StripeConnectButton hasAccount={!!status} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
