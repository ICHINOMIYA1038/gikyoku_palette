import { CreditCard } from "lucide-react";

export const metadata = { title: "Stripe連携" };

export default function StripePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Stripe連携</h1>

      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-16 px-4 text-center">
        <CreditCard className="mb-4 h-12 w-12 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-700">
          決済機能は現在準備中です
        </h2>
        <p className="mt-2 max-w-md text-sm text-gray-500">
          Stripe連携による上演許可料の決済機能は、サービス正式リリースまでご利用いただけません。
          現在は無料作品の公開・閲覧のみご利用可能です。
        </p>
      </div>
    </div>
  );
}
