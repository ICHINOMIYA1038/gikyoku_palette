import Link from "next/link";
import Image from "next/image";
import { Heart, Clock, Users } from "lucide-react";
import { getMyBookmarks } from "@/actions/bookmarks";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "お気に入り" };
export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const bookmarks = await getMyBookmarks();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 flex items-center gap-2 text-2xl font-serif font-bold text-gray-900">
        <Heart className="h-6 w-6 text-pink-500" />
        お気に入り
      </h1>

      {bookmarks.length === 0 ? (
        <div className="rounded-lg border border-gray-200 py-16 text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-gray-500">まだお気に入り作品はありません</p>
          <p className="mt-1 text-xs text-gray-400">
            気になる作品の ♡ を押すとここに溜まります
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {bookmarks.map((b) => (
            <li key={b.id}>
              <Link
                href={`/plays/${b.play.id}`}
                className="block overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm"
              >
                <div className="relative h-32 w-full bg-gray-50">
                  {b.play.coverImageUrl ? (
                    <Image
                      src={b.play.coverImageUrl}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-serif text-3xl text-gray-300">
                      {b.play.title.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-medium text-gray-900">{b.play.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {b.play.authorDisplayName}
                  </p>
                  <ul className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                    <li className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {b.play.durationMinutes}分
                    </li>
                    <li className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {b.play.castTotal}人
                    </li>
                    <li>
                      {b.play.isFree
                        ? "無料"
                        : formatCurrency(b.play.feeAmount)}
                    </li>
                  </ul>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
