"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName: parsed.data.displayName,
      bio: parsed.data.bio || null,
    },
  });

  revalidatePath("/profile/edit");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getAuthorProfile(authorId: string) {
  const author = await prisma.user.findUnique({
    where: { id: authorId },
    include: {
      plays: {
        where: { isPublished: true },
        include: { genres: { include: { genre: true } } },
        orderBy: { publishedAt: "desc" },
      },
    },
  });

  return author;
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
  });

  return profile;
}
