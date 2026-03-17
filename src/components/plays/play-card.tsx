import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { truncateText, formatCurrency } from "@/lib/utils";

type PlayCardProps = {
  id: string;
  title: string;
  authorName: string;
  authorId: string;
  synopsis: string;
  durationMinutes: number;
  castTotal: number;
  genres: { name: string }[];
  isFree: boolean;
  feeAmount: number;
  viewCount: number;
};

export function PlayCard({
  id,
  title,
  authorName,
  authorId,
  synopsis,
  durationMinutes,
  castTotal,
  genres,
  isFree,
  feeAmount,
  viewCount,
}: PlayCardProps) {
  return (
    <Link href={`/plays/${id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-2 text-lg">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/authors/${authorId}`}
              className="hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {authorName}
            </Link>
          </p>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="mb-3 text-sm text-muted-foreground">
            {truncateText(synopsis, 100)}
          </p>
          <div className="flex flex-wrap gap-1">
            {genres.map((genre) => (
              <Badge key={genre.name} variant="secondary" className="text-xs">
                {genre.name}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between text-xs text-muted-foreground">
          <div className="flex gap-3">
            <span>{durationMinutes}分</span>
            <span>{castTotal}人</span>
            <span>{viewCount.toLocaleString()}回閲覧</span>
          </div>
          <span className="font-medium">
            {isFree ? "無料" : formatCurrency(feeAmount)}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
