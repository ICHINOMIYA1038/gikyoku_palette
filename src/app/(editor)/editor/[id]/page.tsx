import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EditorSwitcher } from "./editor-switcher";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-1.5 shrink-0">
        <Link
          href={`/dashboard/plays/${id}/edit`}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          戻る
        </Link>
        <span className="text-sm font-medium text-gray-900 truncate">
          {play.title}
        </span>
      </div>
      <EditorSwitcher
        playId={play.id}
        initialContent={play.bodyJson as Record<string, unknown> | null}
      />
    </div>
  );
}
