import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { PlayEditForm } from "./play-edit-form";

export const metadata = { title: "作品編集" };

type Props = { params: Promise<{ id: string }> };

export default async function PlayEditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const play = await prisma.play.findUnique({
    where: { id },
    include: { genres: { include: { genre: true } } },
  });

  if (!play || play.authorId !== user.id) notFound();

  const genres = await prisma.genre.findMany({ orderBy: { id: "asc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">作品編集</h1>
      <PlayEditForm play={play} genres={genres} />
    </div>
  );
}
