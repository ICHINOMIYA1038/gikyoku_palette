import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, ArrowRight } from "lucide-react";

type AuthorCardProps = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  playCount: number;
};

export function AuthorCard({
  id,
  displayName,
  avatarUrl,
  bio,
  playCount,
}: AuthorCardProps) {
  return (
    <Link
      href={`/authors/${id}`}
      className="group block rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-pink-200 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 shrink-0 ring-2 ring-gray-50">
          <AvatarImage src={avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-lg font-medium bg-gradient-to-br from-pink-100 to-pink-200 text-pink-700">
            {displayName.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-semibold text-gray-900 group-hover:text-pink-700 transition-colors">
              {displayName}
            </h3>
            <ArrowRight className="h-4 w-4 text-gray-300 shrink-0 group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="mt-1.5 text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
            {bio || "プロフィール未設定"}
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-gray-400">
            <BookOpen className="h-3 w-3" />
            <span className="font-medium text-gray-700">{playCount}</span>
            作品
          </p>
        </div>
      </div>
    </Link>
  );
}
