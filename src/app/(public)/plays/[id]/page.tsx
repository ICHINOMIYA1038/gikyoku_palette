import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPlayById, incrementViewCount } from "@/actions/plays";
import { PlayMetadata } from "@/components/plays/play-metadata";
import { PlayBody } from "@/components/plays/play-body";
import { PermissionCta } from "@/components/permissions/permission-cta";
import { truncateText } from "@/lib/utils";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const play = await getPlayById(id);
  if (!play) return { title: "作品が見つかりません" };

  return {
    title: play.title,
    description: truncateText(play.synopsis, 160),
    openGraph: {
      title: `${play.title} | 戯曲パレット`,
      description: truncateText(play.synopsis, 160),
      type: "article",
    },
  };
}

export default async function PlayDetailPage({ params }: Props) {
  const { id } = await params;
  const play = await getPlayById(id);

  if (!play || !play.isPublished) {
    notFound();
  }

  // Increment view count (fire and forget)
  incrementViewCount(id);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold">{play.title}</h1>

      <Link
        href={`/authors/${play.author.id}`}
        className="mb-6 flex items-center gap-3 hover:opacity-80"
      >
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={play.author.avatarUrl || undefined}
            alt={play.author.displayName}
          />
          <AvatarFallback>
            {play.author.displayName.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{play.author.displayName}</p>
          <p className="text-sm text-muted-foreground">執筆者</p>
        </div>
      </Link>

      <PlayMetadata
        durationMinutes={play.durationMinutes}
        castTotal={play.castTotal}
        castMale={play.castMale}
        castFemale={play.castFemale}
        castOther={play.castOther}
        genres={play.genres.map((pg) => pg.genre.name)}
        isFree={play.isFree}
        feeAmount={play.feeAmount}
        viewCount={play.viewCount}
      />

      <div className="my-6">
        <h2 className="mb-2 text-xl font-semibold">あらすじ</h2>
        <p className="whitespace-pre-wrap text-muted-foreground">
          {play.synopsis}
        </p>
      </div>

      <PermissionCta playId={play.id} isFree={play.isFree} feeAmount={play.feeAmount} />

      {play.body ? (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">本文</h2>
          <PlayBody body={play.body} />
        </div>
      ) : (
        <div className="mt-8 rounded-lg border p-8 text-center text-muted-foreground">
          本文は準備中です
        </div>
      )}
    </div>
  );
}
