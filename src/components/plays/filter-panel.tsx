"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Genre = { id: number; name: string; slug: string };

const DURATION_OPTIONS = [
  { label: "指定なし", value: "" },
  { label: "30分以内", value: "30" },
  { label: "60分以内", value: "60" },
  { label: "90分以内", value: "90" },
  { label: "120分以内", value: "120" },
];

const CAST_OPTIONS = [
  { label: "指定なし", value: "" },
  { label: "1〜3人", value: "3" },
  { label: "4〜6人", value: "6" },
  { label: "7〜10人", value: "10" },
  { label: "11人以上", value: "999" },
];

export function FilterPanel({ genres }: { genres: Genre[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={searchParams.get("genre") || ""}
        onValueChange={(v) => updateFilter("genre", v ?? "")}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="ジャンル" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">すべて</SelectItem>
          {genres.map((genre) => (
            <SelectItem key={genre.slug} value={genre.slug}>
              {genre.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("duration") || ""}
        onValueChange={(v) => updateFilter("duration", v ?? "")}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="上演時間" />
        </SelectTrigger>
        <SelectContent>
          {DURATION_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("cast") || ""}
        onValueChange={(v) => updateFilter("cast", v ?? "")}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="出演人数" />
        </SelectTrigger>
        <SelectContent>
          {CAST_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
