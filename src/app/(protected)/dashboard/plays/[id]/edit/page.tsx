import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listSeriesByAuthor } from "@/actions/series";
import { getTagsForPlay } from "@/actions/tags";
import { PlayEditForm } from "./play-edit-form";
import { TagsEditor } from "@/components/plays/tags-editor";
import Link from "next/link";
import { PenLine } from "lucide-react";

export const metadata = { title: "作品編集" };

type Props = { params: Promise<{ id: string }> };

export default async function PlayEditPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const play = await prisma.palettePlay.findUnique({
    where: { id },
    include: { genres: { include: { genre: true } } },
  });

  if (!play || play.authorId !== session.user.id) notFound();

  const [genres, seriesList, tags] = await Promise.all([
    prisma.paletteGenre.findMany({ orderBy: { id: "asc" } }),
    listSeriesByAuthor(session.user.id),
    getTagsForPlay(play.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">作品編集</h1>
        <Link
          href={`/editor/${play.id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <PenLine className="h-4 w-4" />
          執筆エディタで書く
        </Link>
      </div>
      <PlayEditForm play={play} genres={genres} seriesList={seriesList} />
      <TagsEditor playId={play.id} initialTags={tags} />
    </div>
  );
}
