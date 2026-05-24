"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth-helpers";
import { ok, fail } from "@/lib/action-result";

export type PayoutTemplate = {
  id: string;
  label: string;
  content: string;
  isDefault: boolean;
};

export async function listPayoutTemplates(): Promise<PayoutTemplate[]> {
  const userId = await requireUserId();
  const rows = await prisma.palettePayoutTemplate.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, label: true, content: true, isDefault: true },
  });
  return rows;
}

export async function createPayoutTemplate(formData: FormData) {
  const userId = await requireUserId();
  const label = String(formData.get("label") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const isDefault = formData.get("isDefault") === "on";

  if (!label) return fail("ラベルを入力してください");
  if (!content) return fail("振込先情報を入力してください");
  if (label.length > 50) return fail("ラベルは50文字以内です");
  if (content.length > 500) return fail("振込先情報は500文字以内です");

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.palettePayoutTemplate.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    await tx.palettePayoutTemplate.create({
      data: { userId, label, content, isDefault },
    });
  });

  revalidatePath("/profile/edit");
  return ok();
}

export async function updatePayoutTemplate(id: string, formData: FormData) {
  const userId = await requireUserId();
  const label = String(formData.get("label") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const isDefault = formData.get("isDefault") === "on";

  if (!label) return fail("ラベルを入力してください");
  if (!content) return fail("振込先情報を入力してください");

  const existing = await prisma.palettePayoutTemplate.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return fail("権限がありません");

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.palettePayoutTemplate.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      });
    }
    await tx.palettePayoutTemplate.update({
      where: { id },
      data: { label, content, isDefault },
    });
  });

  revalidatePath("/profile/edit");
  return ok();
}

export async function deletePayoutTemplate(id: string) {
  const userId = await requireUserId();
  const existing = await prisma.palettePayoutTemplate.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return fail("権限がありません");
  await prisma.palettePayoutTemplate.delete({ where: { id } });
  revalidatePath("/profile/edit");
  return ok();
}
