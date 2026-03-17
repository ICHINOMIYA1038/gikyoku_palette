import { getReceivedApplications } from "@/actions/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PermissionReview } from "@/components/dashboard/permission-review";
import { formatDate } from "@/lib/utils";
import { PERMISSION_STATUS_LABELS } from "@/types";
import type { PermissionStatus } from "@/types";

export const metadata = { title: "申請管理" };

export default async function DashboardPermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; review?: string }>;
}) {
  const params = await searchParams;
  const applications = await getReceivedApplications(params.status);

  const reviewId = params.review;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">申請管理</h1>

      {applications.length === 0 ? (
        <p className="text-muted-foreground">申請はありません。</p>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{app.play.title}</p>
                      <p className="text-sm text-muted-foreground">
                        申請者: {app.applicant.displayName} / {formatDate(app.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        app.status === "pending"
                          ? "outline"
                          : app.status === "permitted"
                            ? "default"
                            : app.status === "rejected"
                              ? "destructive"
                              : "secondary"
                      }
                    >
                      {PERMISSION_STATUS_LABELS[app.status as PermissionStatus]}
                    </Badge>
                  </div>
                  {app.status === "pending" && (
                    <PermissionReview permissionId={app.id} expanded={reviewId === app.id} />
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
