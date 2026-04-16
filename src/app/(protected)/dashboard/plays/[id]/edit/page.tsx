import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PlayEditForm } from "./play-edit-form";

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

  const genres = await prisma.paletteGenre.findMany({ orderBy: { id: "asc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">作品編集</h1>
      <PlayEditForm play={play} genres={genres} />
    </div>
  );
}
