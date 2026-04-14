import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permission = await prisma.performancePermission.findUnique({
    where: { id },
    include: {
      play: {
        include: { author: { select: { displayName: true } } },
      },
      applicant: { select: { displayName: true } },
    },
  });

  if (!permission || permission.status !== "permitted") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (permission.applicantId !== user.id && permission.play.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate simple text-based certificate (MVP)
  // TODO: Replace with @react-pdf/renderer for proper PDF generation
  const certificate = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        上 演 許 可 証
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

許可番号: ${permission.permissionNumber}

作品名: ${permission.play.title}
執筆者: ${permission.play.author.displayName}

申請者: ${permission.organizationName}
代表者: ${permission.representativeName}
公演名: ${permission.performanceTitle}

公演期間: ${formatDate(permission.startDate)} 〜 ${formatDate(permission.endDate)}
会場: ${permission.venueName}（${permission.venueLocation}）
上演回数: ${permission.numPerformances}回

許可日: ${permission.paidAt ? formatDate(permission.paidAt) : formatDate(permission.reviewedAt!)}

上記の通り、上演を許可します。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        戯曲パレットプラットフォーム
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  return new NextResponse(certificate, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="permission-${permission.permissionNumber}.txt"`,
    },
  });
}
