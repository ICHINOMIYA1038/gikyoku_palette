import { getSalesSummary } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "売上" };

export default async function SalesPage() {
  const { payments, totalRevenue, totalFees } = await getSalesSummary();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">売上</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">総売上（受取額）</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">総手数料</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalFees)}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-4 text-xl font-semibold">決済履歴</h2>

      {payments.length === 0 ? (
        <p className="text-muted-foreground">まだ売上はありません。</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日付</TableHead>
              <TableHead>作品</TableHead>
              <TableHead>申請者</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead className="text-right">手数料</TableHead>
              <TableHead className="text-right">受取額</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.completedAt ? formatDate(payment.completedAt) : "-"}</TableCell>
                <TableCell>{payment.permission.play.title}</TableCell>
                <TableCell>{payment.permission.applicant.displayName}</TableCell>
                <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(payment.platformFee)}</TableCell>
                <TableCell className="text-right">{formatCurrency(payment.authorAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
