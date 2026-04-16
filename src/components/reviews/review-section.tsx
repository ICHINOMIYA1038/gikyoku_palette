import { auth } from "@/lib/auth";
import { getReviews, getUserReview } from "@/actions/reviews";
import { ReviewForm } from "./review-form";
import { ReviewList } from "./review-list";

interface ReviewSectionProps {
  playId: string;
  authorId: string;
}

export async function ReviewSection({ playId, authorId }: ReviewSectionProps) {
  const [session, { reviews, total }, userReview] = await Promise.all([
    auth(),
    getReviews(playId),
    getUserReview(playId),
  ]);

  const isLoggedIn = !!session?.user?.id;
  const isAuthor = session?.user?.id === authorId;
  const showForm = isLoggedIn && !isAuthor;

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">レビュー（{total}件）</h2>

      {showForm && (
        <ReviewForm playId={playId} existingReview={userReview} />
      )}

      <ReviewList reviews={reviews} total={total} />

      {total === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">まだレビューはありません。</p>
      )}
    </section>
  );
}
