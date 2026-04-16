import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/actions/notifications";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const expiredPermissions = await prisma.palettePermission.findMany({
    where: {
      status: "approved",
      expiresAt: { lt: now },
    },
    include: { play: true },
  });

  for (const permission of expiredPermissions) {
    await prisma.palettePermission.update({
      where: { id: permission.id },
      data: { status: "expired" },
    });

    await createNotification({
      userId: permission.applicantId,
      type: "permission_expired",
      permissionId: permission.id,
      title: "上演許可申請の期限切れ",
      message: `「${permission.play.title}」の上演許可申請が決済期限を超えたため、期限切れになりました。`,
    });
  }

  return NextResponse.json({
    expired: expiredPermissions.length,
  });
}
