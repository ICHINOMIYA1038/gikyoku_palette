import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type PermissionCtaProps = {
  playId: string;
  isFree: boolean;
  feeAmount: number;
};

export function PermissionCta({
  playId,
  isFree,
  feeAmount,
}: PermissionCtaProps) {
  return (
    <div className="rounded-lg border bg-primary/5 p-6 text-center">
      <h3 className="mb-2 text-lg font-semibold">この作品を上演しませんか？</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        上演料：{isFree ? "無料" : formatCurrency(feeAmount)}
      </p>
      <Button size="lg" render={<Link href={`/permissions/new/${playId}`}>上演許可を申請する</Link>} />
    </div>
  );
}
