import Link from "next/link";
import { UserPlus, User } from "lucide-react";
import { getFollowing } from "@/actions/follows";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const metadata = { title: "フォロー中" };
export const dynamic = "force-dynamic";

export default async function FollowingPage() {
  const followees = await getFollowing();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 flex items-center gap-2 text-2xl font-serif font-bold text-gray-900">
        <UserPlus className="h-6 w-6 text-pink-500" />
        フォロー中の作家
      </h1>

      {followees.length === 0 ? (
        <div className="rounded-lg border border-gray-200 py-16 text-center">
          <User className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-gray-500">まだ誰もフォローしていません</p>
          <p className="mt-1 text-xs text-gray-400">
            気になる作家のプロフィールから「フォローする」を押すと、
            新作公開時に通知が届きます
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
          {followees.map((u) => (
            <li key={u.id}>
              <Link
                href={`/authors/${u.id}`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-gray-50"
              >
                <Avatar className="h-10 w-10">
                  {u.avatarUrl ? (
                    <AvatarImage src={u.avatarUrl} alt="" />
                  ) : (
                    <AvatarFallback>{u.name.slice(0, 1)}</AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{u.name}</p>
                  {u.bio && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {u.bio}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
