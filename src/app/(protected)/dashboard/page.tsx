import { getDashboardSummary } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "ダッシュボード" };

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  const cards = [
    { title: "公開作品数", value: `${summary.publishedPlays}作品` },
    { title: "総閲覧数", value: `${summary.totalViews.toLocaleString()}回` },
    {
      title: "未対応申請",
      value: `${summary.pendingApplications}件`,
      highlight: summary.pendingApplications > 0,
    },
    { title: "今月の売上", value: formatCurrency(summary.monthlyRevenue) },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">ダッシュボード</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className={card.highlight ? "border-primary" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
