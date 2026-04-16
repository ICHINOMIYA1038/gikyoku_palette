import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGenres } from "@/actions/plays";
import { PlayCreateForm } from "./play-create-form";

export const metadata = { title: "新規作品投稿" };

export default async function PlayCreatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const genres = await getGenres();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-8">
        新規作品投稿
      </h1>
      <PlayCreateForm genres={genres} />
    </div>
  );
}
