import { Banknote } from "lucide-react";

export const metadata = { title: "売上" };

export default function SalesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">売上</h1>

      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-16 px-4 text-center">
        <Banknote className="mb-4 h-12 w-12 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-700">
          売上機能は現在準備中です
        </h2>
        <p className="mt-2 max-w-md text-sm text-gray-500">
          Stripe連携による決済・売上管理機能は、サービス正式リリースまでご利用いただけません。
        </p>
      </div>
    </div>
  );
}
