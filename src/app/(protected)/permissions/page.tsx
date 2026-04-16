import Link from "next/link";
import { getMyApplications } from "@/actions/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PERMISSION_STATUS_LABELS } from "@/types";
import type { PermissionStatus } from "@/types";

export const metadata = { title: "マイ申請" };

export default async function MyPermissionsPage() {
  const applications = await getMyApplications();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">マイ申請</h1>

      {applications.length === 0 ? (
        <p className="text-muted-foreground">まだ申請はありません。</p>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Link key={app.id} href={app.thread ? `/threads/${app.thread.id}` : "#"}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{app.play.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {app.organizationName} / {formatDate(app.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        app.status === "permitted"
                          ? "default"
                          : app.status === "rejected" || app.status === "expired"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {PERMISSION_STATUS_LABELS[app.status as PermissionStatus]}
                    </Badge>
                    <p className="mt-1 text-sm">
                      {app.feeAmount === 0 ? "無料" : formatCurrency(app.feeAmount)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
