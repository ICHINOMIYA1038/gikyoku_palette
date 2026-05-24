"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const SORT_OPTIONS = [
  { value: "newest", label: "新着順" },
  { value: "views", label: "閲覧数順" },
  { value: "rating", label: "評価順" },
  { value: "downloads", label: "DL数順" },
] as const;

export function SortSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") || "newest";
  const currentLabel =
    SORT_OPTIONS.find((o) => o.value === currentSort)?.label ?? "新着順";

  const handleSort = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "newest") {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <Select value={currentSort} onValueChange={handleSort}>
      <SelectTrigger className="w-[140px]">
        <span className="truncate">{currentLabel}</span>
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
