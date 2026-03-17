"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SortSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    <Select
      value={searchParams.get("sort") || "newest"}
      onValueChange={handleSort}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">新着順</SelectItem>
        <SelectItem value="views">閲覧数順</SelectItem>
      </SelectContent>
    </Select>
  );
}
