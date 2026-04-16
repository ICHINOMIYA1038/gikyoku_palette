"use client";

import { useActionState, useState } from "react";
import { createReview } from "@/actions/reviews";
import { StarRating } from "./star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  error?: string | Record<string, string[]>;
  success?: boolean;
} | null;

interface ReviewFormProps {
  playId: string;
  existingReview?: {
    id: string;
    rating: number;
    comment: string | null;
  } | null;
}

export function ReviewForm({ playId, existingReview }: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);

  async function formAction(
    _prevState: FormState,
    formData: FormData
  ): Promise<FormState> {
    return await createReview(playId, formData);
  }

  const [state, action, isPending] = useActionState(formAction, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">評価</label>
        <StarRating
          rating={rating}
          interactive
          onChange={setRating}
        />
        <input type="hidden" name="rating" value={rating} />
      </div>

      <div>
        <Textarea
          name="comment"
          rows={4}
          maxLength={2000}
          placeholder="感想を書いてみませんか？（任意）"
          defaultValue={existingReview?.comment ?? ""}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">
          {typeof state.error === "string"
            ? state.error
            : Object.values(state.error).flat().join(", ")}
        </p>
      )}

      {state?.success && (
        <p className="text-sm text-green-600">
          レビューを投稿しました。
        </p>
      )}

      <Button type="submit" disabled={isPending || rating === 0}>
        {isPending
          ? "送信中..."
          : existingReview
            ? "レビューを更新"
            : "レビューを投稿"}
      </Button>
    </form>
  );
}
