import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TogglePublishButton } from "./toggle-publish-button";

export const metadata = { title: "作品管理" };

export default async function DashboardPlaysPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const plays = await prisma.play.findMany({
    where: { authorId: user.id },
    include: {
      genres: { include: { genre: true } },
      _count: { select: { permissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">作品管理</h1>

      {plays.length === 0 ? (
        <p className="text-muted-foreground">
          まだ作品がありません。作品投稿機能は近日公開予定です。
        </p>
      ) : (
        <div className="space-y-3">
          {plays.map((play) => (
            <Card key={play.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{play.title}</p>
                    <Badge variant={play.isPublished ? "default" : "secondary"}>
                      {play.isPublished ? "公開中" : "非公開"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    閲覧: {play.viewCount}回 / 申請: {play._count.permissions}件
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" render={<Link href={`/dashboard/plays/${play.id}/edit`} />}>
                    編集
                  </Button>
                  <TogglePublishButton
                    playId={play.id}
                    isPublished={play.isPublished}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
