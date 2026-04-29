import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const users = await prisma.$queryRaw<any[]>`
    SELECT id, name, email, "displayName", bio, "avatarUrl", "groupName", image
    FROM "public"."User" WHERE id = ${session.user.id}
  `;

  const profile = users[0];
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
