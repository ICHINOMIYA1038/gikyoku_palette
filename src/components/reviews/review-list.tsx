import { StarRating } from "./star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ReviewListProps {
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    user: {
      displayName: string;
      avatarUrl: string | null;
    };
  }>;
  total: number;
}

export function ReviewList({ reviews, total }: ReviewListProps) {
  if (total === 0) return null;

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="flex gap-3">
          <Avatar className="h-8 w-8" size="sm">
            {review.user.avatarUrl && (
              <AvatarImage src={review.user.avatarUrl} alt={review.user.displayName} />
            )}
            <AvatarFallback>
              {review.user.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{review.user.displayName}</span>
              <StarRating rating={review.rating} size="sm" />
            </div>

            {review.comment && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {review.comment}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
