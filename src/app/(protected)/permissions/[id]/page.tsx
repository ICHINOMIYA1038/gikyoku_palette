import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * 後方互換のためのリダイレクト。
 * 旧 /permissions/[id] を開いた人（通知メールや古いブックマーク）を
 * 新UIの /threads/[threadId] に流す。
 */
export default async function LegacyPermissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const permission = await prisma.palettePermission.findUnique({
    where: { id },
    select: {
      applicantId: true,
      play: { select: { authorId: true } },
      thread: { select: { id: true } },
    },
  });
  if (!permission) notFound();
  if (
    permission.applicantId !== session.user.id &&
    permission.play.authorId !== session.user.id
  ) {
    notFound();
  }
  if (!permission.thread) notFound();
  redirect(`/threads/${permission.thread.id}`);
}
