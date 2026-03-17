import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { ProfileEditForm } from "./profile-edit-form";

export const metadata = {
  title: "プロフィール編集",
};

export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams: Promise<{ first?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!profile) redirect("/login");

  const params = await searchParams;
  const isFirstLogin = params.first === "true";

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">
        {isFirstLogin ? "プロフィールを設定してください" : "プロフィール編集"}
      </h1>
      {isFirstLogin && (
        <p className="mb-6 text-muted-foreground">
          表示名はサイト上で公開されます。ペンネームを設定できます。
        </p>
      )}
      <ProfileEditForm profile={profile} />
    </div>
  );
}
