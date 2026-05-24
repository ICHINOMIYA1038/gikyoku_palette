import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listSeriesByAuthor } from "@/actions/series";
import { getTagsForPlay } from "@/actions/tags";
import { PlayEditForm } from "./play-edit-form";
import { TagsEditor } from "@/components/plays/tags-editor";

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
      <h1 className="text-2xl font-bold">作品編集</h1>
      <PlayEditForm play={play} genres={genres} seriesList={seriesList} />
      <TagsEditor playId={play.id} initialTags={tags} />
    </div>
  );
}
