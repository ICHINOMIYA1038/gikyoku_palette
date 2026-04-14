"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, "表示名を入力してください")
    .max(50, "表示名は50文字以内で入力してください"),
  bio: z.string().max(500, "自己紹介は500文字以内で入力してください").optional(),
});

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.palettePlay.count(); // Prisma client warm-up
  // User is in public schema, accessed via tosyokan's Prisma
  // For now, update via raw query since User isn't in palette schema
  await prisma.$executeRaw`
    UPDATE "User" SET "displayName" = ${parsed.data.displayName}, "bio" = ${parsed.data.bio || null}
    WHERE id = ${session.user.id}
  `;

  revalidatePath("/profile/edit");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getAuthorProfile(authorId: string) {
  const author = await prisma.$queryRaw<any[]>`
    SELECT id, name, "displayName", bio, "avatarUrl", "groupName", image
    FROM "User" WHERE id = ${authorId}
  `;
  if (!author[0]) return null;

  const plays = await prisma.palettePlay.findMany({
    where: { authorId, isPublished: true },
    include: { genres: { include: { genre: true } } },
    orderBy: { publishedAt: "desc" },
  });

  return { ...author[0], plays };
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const users = await prisma.$queryRaw<any[]>`
    SELECT id, name, email, "displayName", bio, "avatarUrl", "groupName", image, role
    FROM "User" WHERE id = ${session.user.id}
  `;

  return users[0] || null;
}
