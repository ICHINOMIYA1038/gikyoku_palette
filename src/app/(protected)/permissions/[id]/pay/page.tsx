import { notFound, redirect } from "next/navigation";
import { getPermissionById } from "@/actions/permissions";
import { PaymentButton } from "./payment-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "上演料の支払い" };

type Props = { params: Promise<{ id: string }> };

export default async function PaymentPage({ params }: Props) {
  const { id } = await params;
  const permission = await getPermissionById(id);

  if (!permission) notFound();
  if (permission.status !== "approved") redirect(`/permissions/${id}`);
  if (permission.currentUserId !== permission.applicantId) notFound();

  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">上演料の支払い</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{permission.play.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">上演料</span>
            <span>{formatCurrency(permission.feeAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">プラットフォーム手数料(5%)</span>
            <span>{formatCurrency(permission.platformFee)}</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between font-bold">
              <span>合計</span>
              <span>{formatCurrency(permission.feeAmount)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            ※執筆者への支払額: {formatCurrency(permission.feeAmount - permission.platformFee)}
          </p>
        </CardContent>
      </Card>

      <PaymentButton permissionId={id} />
    </div>
  );
}
