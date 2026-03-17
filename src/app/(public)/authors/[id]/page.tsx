import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAuthorProfile } from "@/actions/auth";
import { PlayCard } from "@/components/plays/play-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const author = await getAuthorProfile(id);
  if (!author) return { title: "執筆者が見つかりません" };
  return { title: `${author.displayName}の作品` };
}

export default async function AuthorProfilePage({ params }: Props) {
  const { id } = await params;
  const author = await getAuthorProfile(id);

  if (!author) notFound();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage
            src={author.avatarUrl || undefined}
            alt={author.displayName}
          />
          <AvatarFallback className="text-xl">
            {author.displayName.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{author.displayName}</h1>
          {author.bio && (
            <p className="mt-1 text-muted-foreground">{author.bio}</p>
          )}
        </div>
      </div>

      <h2 className="mb-4 text-xl font-semibold">
        公開作品（{author.plays.length}件）
      </h2>

      {author.plays.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {author.plays.map((play) => (
            <PlayCard
              key={play.id}
              id={play.id}
              title={play.title}
              authorName={author.displayName}
              authorId={author.id}
              synopsis={play.synopsis}
              durationMinutes={play.durationMinutes}
              castTotal={play.castTotal}
              genres={play.genres.map((pg) => ({ name: pg.genre.name }))}
              isFree={play.isFree}
              feeAmount={play.feeAmount}
              viewCount={play.viewCount}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">まだ公開作品はありません。</p>
      )}
    </div>
  );
}
