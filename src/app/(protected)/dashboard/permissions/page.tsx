import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getReceivedApplications } from "@/actions/permissions";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { PERMISSION_STATUS_LABELS } from "@/types";
import type { PermissionStatus } from "@/types";

export const metadata = { title: "申請管理" };
export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<
  PermissionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  approved: "secondary",
  permitted: "default",
  rejected: "destructive",
  expired: "destructive",
  revision_requested: "outline",
  withdrawn: "secondary",
};

export default async function DashboardPermissionsPage() {
  const applications = await getReceivedApplications();

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-8">
        許可申請
      </h1>

      {applications.length === 0 ? (
        <div className="text-center py-16">
          <ShieldCheck className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">申請はありません。</p>
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
                      <p className="truncate font-medium text-gray-900">
                        {app.play.title}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-gray-500">
                        申請者: {app.applicant.displayName} /{" "}
                        {formatDate(app.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={STATUS_VARIANT[status]}
                      className="shrink-0"
                    >
                      {PERMISSION_STATUS_LABELS[status]}
                    </Badge>
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
