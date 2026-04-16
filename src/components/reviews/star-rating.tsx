"use client";

import { useState } from "react";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  interactive?: boolean;
  size?: "sm" | "md";
  onChange?: (rating: number) => void;
}

export function StarRating({
  rating,
  maxRating = 5,
  interactive = false,
  size = "md",
  onChange,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const displayRating = hoverRating || rating;

  return (
    <div className="inline-flex gap-0.5">
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= displayRating;

        return (
          <svg
            key={i}
            className={`${sizeClass} ${
              filled ? "text-yellow-400" : "text-gray-300"
            } ${interactive ? "cursor-pointer" : ""}`}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => interactive && onChange?.(starValue)}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      })}
    </div>
  );
}
