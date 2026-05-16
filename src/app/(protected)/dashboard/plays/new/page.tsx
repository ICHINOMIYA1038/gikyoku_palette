import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGenres } from "@/actions/plays";
import { listSeriesByAuthor } from "@/actions/series";
import { PlayCreateForm } from "./play-create-form";
import { QuickStartEditor } from "./quick-start-editor";

export const metadata = { title: "新規作品投稿" };

export default async function PlayCreatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [genres, seriesList] = await Promise.all([
    getGenres(),
    listSeriesByAuthor(session.user.id),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-8">
        新規作品投稿
      </h1>
      <QuickStartEditor />
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">または詳細を入力して投稿</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <PlayCreateForm genres={genres} seriesList={seriesList} />
    </div>
  );
}
