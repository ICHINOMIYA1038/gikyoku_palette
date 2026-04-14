"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { permissionFormSchema } from "@/lib/validations/permission";
import { calculatePlatformFee, generatePermissionNumber } from "@/lib/utils";
import { createNotification } from "@/actions/notifications";

export async function createPermission(playId: string, formData: FormData) {
  
  
    
  
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const play = await prisma.palettePlay.findUnique({
    where: { id: playId },
    include: { author: true },
  });
  if (!play || !play.isPublished) {
    return { error: "作品が見つかりません" };
  }

  const parsed = permissionFormSchema.safeParse({
    organizationName: formData.get("organizationName"),
    representativeName: formData.get("representativeName"),
    performanceTitle: formData.get("performanceTitle"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    venueName: formData.get("venueName"),
    venueLocation: formData.get("venueLocation"),
    expectedAudience: formData.get("expectedAudience"),
    ticketType: formData.get("ticketType"),
    numPerformances: formData.get("numPerformances"),
    applicantMessage: formData.get("applicantMessage") || "",
  });

  if (!parsed.success) {
    return { error: "入力内容に誤りがあります", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const feeAmount = play.isFree ? 0 : play.feeAmount;
  const platformFee = calculatePlatformFee(feeAmount);

  const permission = await prisma.palettePermission.create({
    data: {
      playId,
      applicantId: session.user.id,
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      feeAmount,
      platformFee,
      status: "pending",
    },
  });

  // Notify the author
  await createNotification({
    userId: play.authorId,
    type: "new_application",
    permissionId: permission.id,
    title: "新しい上演許可申請",
    message: `「${play.title}」に対する上演許可申請が届きました。${parsed.data.organizationName}（${parsed.data.representativeName}）からの申請です。`,
  });

  revalidatePath("/dashboard/permissions");
  return { success: true, permissionId: permission.id };
}

export async function approvePermission(permissionId: string, message?: string) {
  
  
    
  
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: true },
  });

  if (!permission || permission.play.authorId !== session.user.id) {
    return { error: "権限がありません" };
  }

  if (permission.status !== "pending") {
    return { error: "この申請は既に処理されています" };
  }

  const isFree = permission.feeAmount === 0;
  const newStatus = isFree ? "permitted" : "approved";
  const permissionNumber = isFree ? generatePermissionNumber() : null;

  await prisma.palettePermission.update({
    where: { id: permissionId },
    data: {
      status: newStatus,
      authorMessage: message || null,
      reviewedAt: new Date(),
      permissionNumber,
      expiresAt: isFree ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await createNotification({
    userId: permission.applicantId,
    type: "approved",
    permissionId,
    title: isFree ? "上演が許可されました" : "上演許可が承認されました",
    message: isFree
      ? `「${permission.play.title}」の上演が許可されました。許可証をダウンロードできます。`
      : `「${permission.play.title}」の上演許可が承認されました。上演料の決済を行ってください（30日以内）。`,
  });

  revalidatePath("/dashboard/permissions");
  revalidatePath("/permissions");
  return { success: true };
}

export async function rejectPermission(
  permissionId: string,
  reason: string,
  message?: string
) {
  
  
    
  
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: true },
  });

  if (!permission || permission.play.authorId !== session.user.id) {
    return { error: "権限がありません" };
  }

  if (permission.status !== "pending") {
    return { error: "この申請は既に処理されています" };
  }

  await prisma.palettePermission.update({
    where: { id: permissionId },
    data: {
      status: "rejected",
      rejectionReason: reason,
      authorMessage: message || null,
      reviewedAt: new Date(),
    },
  });

  await createNotification({
    userId: permission.applicantId,
    type: "rejected",
    permissionId,
    title: "上演許可が却下されました",
    message: `「${permission.play.title}」の上演許可申請が却下されました。理由: ${reason}`,
  });

  revalidatePath("/dashboard/permissions");
  revalidatePath("/permissions");
  return { success: true };
}

export async function getMyApplications() {
  
  
    
  
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return prisma.palettePermission.findMany({
    where: { applicantId: session.user.id },
    include: {
      play: {
        select: { id: true, title: true, isFree: true, feeAmount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPermissionById(id: string) {
  
  
    
  
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const permission = await prisma.palettePermission.findUnique({
    where: { id },
    include: {
      play: {
        include: {
          author: { select: { id: true, displayName: true } },
        },
      },
      applicant: { select: { id: true, displayName: true } },
      payment: true,
    },
  });

  if (!permission) return null;

  // Only allow applicant or play author to view
  if (
    permission.applicantId !== session.user.id &&
    permission.play.authorId !== session.user.id
  ) {
    return null;
  }

  return { ...permission, currentUserId: session.user.id };
}

export async function getReceivedApplications(status?: string) {
  
  
    
  
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const where: Record<string, unknown> = {
    play: { authorId: session.user.id },
  };
  if (status) {
    where.status = status;
  }

  return prisma.palettePermission.findMany({
    where,
    include: {
      play: { select: { id: true, title: true } },
      applicant: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
