import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EditorSwitcher } from "./editor-switcher";
import { EditorHeader } from "./editor-header";

export const metadata = { title: "執筆エディタ" };

type Props = { params: Promise<{ id: string }> };

export default async function EditorPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const play = await prisma.palettePlay.findUnique({
    where: { id },
    select: { id: true, authorId: true, title: true, bodyJson: true },
  });

  if (!play || play.authorId !== session.user.id) notFound();

  return (
    <>
      <EditorHeader playId={play.id} title={play.title} />
      <EditorSwitcher
        playId={play.id}
        initialContent={play.bodyJson as Record<string, unknown> | null}
      />
    </>
  );
}
