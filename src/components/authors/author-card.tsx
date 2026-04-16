import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

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
    <Link href={`/authors/${id}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-start gap-4">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage
              src={avatarUrl || undefined}
              alt={displayName}
            />
            <AvatarFallback className="text-lg">
              {displayName.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900">{displayName}</h3>
            {bio && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {bio}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              作品数: {playCount}件
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
