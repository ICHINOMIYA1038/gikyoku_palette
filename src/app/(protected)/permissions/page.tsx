import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getMyApplications } from "@/actions/permissions";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { PermissionStatus } from "@/types";
import { PermissionStatusBadge } from "@/components/permissions/status-badge";

export const metadata = { title: "マイ申請" };
export const dynamic = "force-dynamic";

export default async function MyPermissionsPage() {
  const applications = await getMyApplications();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 flex items-center gap-2 text-2xl font-serif font-bold text-gray-900">
        <ShieldCheck className="h-6 w-6 text-pink-500" />
        マイ申請
      </h1>

      {applications.length === 0 ? (
        <div className="rounded-lg border border-gray-200 py-16 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-gray-500">まだ申請はありません</p>
          <p className="mt-1 text-xs text-gray-400">
            作品ページから「上演許可を申請する」ボタンで申請を始められます
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
          {applications.map((app) => {
            const status = app.status as PermissionStatus;
            const href = app.thread ? `/threads/${app.thread.id}` : "#";
            return (
              <li key={app.id}>
                <Link
                  href={href}
                  className="block p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-gray-900">
                          {app.play.title}
                        </p>
                        <PermissionStatusBadge status={status} size="sm" />
                      </div>
                      <p className="mt-0.5 truncate text-sm text-gray-500">
                        {app.organizationName} / {formatDate(app.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-gray-500">
                      {app.feeAmount === 0 ? "無料" : formatCurrency(app.feeAmount)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
