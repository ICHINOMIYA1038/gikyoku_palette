import { notFound } from "next/navigation";
import Link from "next/link";
import { getPermissionById } from "@/actions/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PERMISSION_STATUS_LABELS } from "@/types";
import type { PermissionStatus } from "@/types";

export const metadata = { title: "申請詳細" };

type Props = { params: Promise<{ id: string }> };

const statusVariant: Record<PermissionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "secondary",
  permitted: "default",
  rejected: "destructive",
  expired: "destructive",
};

export default async function PermissionDetailPage({ params }: Props) {
  const { id } = await params;
  const permission = await getPermissionById(id);

  if (!permission) notFound();

  const status = permission.status as PermissionStatus;
  const isAuthor = permission.currentUserId === permission.play.authorId;
  const isApplicant = permission.currentUserId === permission.applicantId;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">申請詳細</h1>
        <Badge variant={statusVariant[status]}>
          {PERMISSION_STATUS_LABELS[status]}
        </Badge>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>作品情報</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">
            <Link href={`/plays/${permission.play.id}`} className="hover:underline">
              {permission.play.title}
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            執筆者: {permission.play.author.displayName}
          </p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>申請内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">団体名:</span> {permission.organizationName}</div>
            <div><span className="text-muted-foreground">代表者:</span> {permission.representativeName}</div>
            <div><span className="text-muted-foreground">公演名:</span> {permission.performanceTitle}</div>
            <div><span className="text-muted-foreground">上演回数:</span> {permission.numPerformances}回</div>
            <div><span className="text-muted-foreground">公演期間:</span> {formatDate(permission.startDate)} 〜 {formatDate(permission.endDate)}</div>
            <div><span className="text-muted-foreground">会場:</span> {permission.venueName}</div>
            <div><span className="text-muted-foreground">所在地:</span> {permission.venueLocation}</div>
            <div><span className="text-muted-foreground">想定観客数:</span> {permission.expectedAudience}人</div>
            <div><span className="text-muted-foreground">チケット:</span> {permission.ticketType === "free" ? "無料" : "有料"}</div>
          </div>
          {permission.applicantMessage && (
            <div className="mt-4">
              <p className="text-muted-foreground">申請者メッセージ:</p>
              <p className="mt-1 whitespace-pre-wrap">{permission.applicantMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>上演料</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {permission.feeAmount === 0 ? "無料" : formatCurrency(permission.feeAmount)}
          </p>
          {permission.feeAmount > 0 && (
            <p className="text-sm text-muted-foreground">
              手数料(5%): {formatCurrency(permission.platformFee)} /
              執筆者受取: {formatCurrency(permission.feeAmount - permission.platformFee)}
            </p>
          )}
        </CardContent>
      </Card>

      {permission.authorMessage && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>執筆者からのメッセージ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{permission.authorMessage}</p>
          </CardContent>
        </Card>
      )}

      {permission.rejectionReason && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>却下理由</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{permission.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {isApplicant && status === "approved" && permission.feeAmount > 0 && (
          <Button size="lg" render={<Link href={`/permissions/${id}/pay`} />}>
            上演料を支払う
          </Button>
        )}
        {isApplicant && status === "permitted" && (
          <Button variant="outline" render={<a href={`/api/permissions/${id}/certificate`} download />}>
            許可証をダウンロード
          </Button>
        )}
        {isAuthor && status === "pending" && (
          <Button render={<Link href={`/dashboard/permissions?review=${id}`} />}>
            審査する
          </Button>
        )}
      </div>
    </div>
  );
}
