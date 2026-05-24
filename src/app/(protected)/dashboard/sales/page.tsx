import Link from "next/link";
import { Banknote } from "lucide-react";
import { getSalesSummary } from "@/actions/dashboard";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "売上" };
export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const { items, totalRevenue } = await getSalesSummary();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-serif font-bold text-gray-900">売上</h1>

      <div className="mb-6 rounded-lg border border-gray-200 bg-gradient-to-br from-amber-50 to-white p-6">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Banknote className="h-4 w-4" />
          確定済み上演料合計
        </div>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {formatCurrency(totalRevenue)}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
          戯曲パレットは決済に関与しません。実額は当事者間振込ベースの自己集計です。
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center text-sm text-gray-500">
          まだ確定済みの売上はありません。
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">確定日</th>
                <th className="px-3 py-2 text-left font-medium">作品 / 公演</th>
                <th className="px-3 py-2 text-left font-medium">申請者</th>
                <th className="px-3 py-2 text-right font-medium">金額</th>
                <th className="px-3 py-2 text-left font-medium">許可番号</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {it.transferConfirmedAt
                      ? formatDate(it.transferConfirmedAt)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{it.playTitle}</div>
                    <div className="text-[11px] text-gray-500">
                      {it.organizationName} / {it.performanceTitle}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    {it.applicantDisplayName}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                    {formatCurrency(it.feeAmount)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">
                    {it.permissionNumber ? (
                      <Link
                        href={`/api/permissions/${it.id}/certificate`}
                        className="text-pink-600 hover:underline"
                      >
                        {it.permissionNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
