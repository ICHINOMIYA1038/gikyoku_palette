import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type PermissionCtaProps = {
  /** 将来的に申請ボタンの導線に使うため受け取るが、現状は disabled で未使用 */
  playId?: string;
  isFree: boolean;
  feeAmount: number;
};

export function PermissionCta({
  isFree,
  feeAmount,
}: PermissionCtaProps) {
  return (
    <div className="rounded-lg border bg-primary/5 p-6 text-center">
      <h3 className="mb-2 text-lg font-semibold">この作品を上演しませんか？</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        上演料：{isFree ? "無料" : formatCurrency(feeAmount)}
      </p>
      <Button size="lg" disabled>
        上演許可を申請する（準備中）
      </Button>
    </div>
  );
}
