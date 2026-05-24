import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAuthorProfile } from "@/actions/auth";
import { getFollowState } from "@/actions/follows";
import { auth } from "@/lib/auth";
import { PlayCard } from "@/components/plays/play-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContactAuthorButton } from "@/components/authors/contact-author-button";
import { FollowButton } from "@/components/authors/follow-button";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const author = await getAuthorProfile(id);
  if (!author) return { title: "執筆者が見つかりません" };
  return { title: `${(author.displayName ?? "不明")}の作品` };
}

export default async function AuthorProfilePage({ params }: Props) {
  const { id } = await params;
  const author = await getAuthorProfile(id);

  if (!author) notFound();

  const session = await auth();
  const isSelf = session?.user?.id === author.id;
  const canContact = !!session?.user?.id && !isSelf;
  const followState = await getFollowState(author.id);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={author.avatarUrl || undefined}
              alt={(author.displayName ?? "不明")}
            />
            <AvatarFallback className="text-xl">
              {(author.displayName ?? "不明").slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{(author.displayName ?? "不明")}</h1>
            {author.bio && (
              <p className="mt-1 text-muted-foreground">{author.bio}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {followState.canFollow && (
            <FollowButton
              authorId={author.id}
              initialFollowing={followState.following}
              initialCount={followState.followerCount}
            />
          )}
          {!followState.canFollow && (
            <span className="text-xs text-gray-500">
              {followState.followerCount.toLocaleString()} フォロワー
            </span>
          )}
          {canContact && <ContactAuthorButton authorId={author.id} />}
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
              authorName={(author.displayName ?? "不明")}
              authorId={author.id}
              synopsis={play.synopsis}
              durationMinutes={play.durationMinutes}
              castTotal={play.castTotal}
              genres={play.genres.map((pg) => ({ name: pg.genre.name }))}
              isFree={play.isFree}
              feeAmount={play.feeAmount}
              viewCount={play.viewCount}
              coverImageUrl={play.coverImageUrl}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">まだ公開作品はありません。</p>
      )}
    </div>
  );
}
