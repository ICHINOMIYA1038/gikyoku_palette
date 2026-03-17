import { notFound } from "next/navigation";
import { getPlayById } from "@/actions/plays";
import { PermissionForm } from "./permission-form";

export const metadata = { title: "上演許可申請" };

type Props = { params: Promise<{ playId: string }> };

export default async function NewPermissionPage({ params }: Props) {
  const { playId } = await params;
  const play = await getPlayById(playId);

  if (!play || !play.isPublished) notFound();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">上演許可申請</h1>
      <p className="mb-6 text-muted-foreground">
        「{play.title}」（{play.author.displayName}）の上演許可を申請します
      </p>
      <PermissionForm
        playId={play.id}
        playTitle={play.title}
        isFree={play.isFree}
        feeAmount={play.feeAmount}
      />
    </div>
  );
}
