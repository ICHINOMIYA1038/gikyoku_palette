import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

type PlayMetadataProps = {
  durationMinutes: number;
  castTotal: number;
  castMale: number;
  castFemale: number;
  castOther: number;
  genres: string[];
  isFree: boolean;
  feeAmount: number;
  viewCount: number;
};

export function PlayMetadata({
  durationMinutes,
  castTotal,
  castMale,
  castFemale,
  castOther,
  genres,
  isFree,
  feeAmount,
  viewCount,
}: PlayMetadataProps) {
  const castBreakdown = [
    castMale > 0 && `男${castMale}`,
    castFemale > 0 && `女${castFemale}`,
    castOther > 0 && `不問${castOther}`,
  ]
    .filter(Boolean)
    .join("/");

  return (
    <div className="rounded-lg border p-4 bg-card">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-2">
          <span className="text-lg">⏱</span>
          <div>
            <p className="text-xs text-muted-foreground">上演時間</p>
            <p className="font-medium">約{durationMinutes}分</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-lg">👥</span>
          <div>
            <p className="text-xs text-muted-foreground">出演人数</p>
            <p className="font-medium">
              {castTotal}人{castBreakdown && `（${castBreakdown}）`}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-lg">💰</span>
          <div>
            <p className="text-xs text-muted-foreground">上演料</p>
            <p className="font-medium">
              {isFree ? "無料" : formatCurrency(feeAmount)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-lg">👁</span>
          <div>
            <p className="text-xs text-muted-foreground">閲覧数</p>
            <p className="font-medium">{viewCount.toLocaleString()}回</p>
          </div>
        </div>
      </div>
      {genres.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 pt-3 border-t">
          {genres.map((genre) => (
            <Badge key={genre} variant="secondary">
              {genre}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
