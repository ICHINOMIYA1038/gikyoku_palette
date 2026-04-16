"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type Genre = { id: number; name: string; slug: string };

const MAX_GENRES = 5;

export function GenreSelector({
  genres,
  selectedIds = [],
}: {
  genres: Genre[];
  selectedIds?: number[];
}) {
  const [selected, setSelected] = useState<number[]>(selectedIds);

  function toggle(id: number) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((v) => v !== id);
      }
      if (prev.length >= MAX_GENRES) {
        return prev;
      }
      return [...prev, id];
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => {
        const isSelected = selected.includes(genre.id);
        return (
          <button key={genre.id} type="button" onClick={() => toggle(genre.id)}>
            <Badge variant={isSelected ? "default" : "outline"}>
              {genre.name}
            </Badge>
          </button>
        );
      })}
      {selected.map((id) => (
        <input key={id} type="hidden" name="genreIds" value={id} />
      ))}
    </div>
  );
}
