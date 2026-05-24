import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PermissionForm } from "./permission-form";

export const metadata = { title: "上演許可申請" };

type Props = { params: Promise<{ playId: string }> };

export default async function NewPermissionPage({ params }: Props) {
  const { playId } = await params;

  const play = await prisma.palettePlay.findUnique({
    where: { id: playId },
    select: {
      id: true,
      title: true,
      isPublished: true,
      isFree: true,
      feeAmount: true,
      acceptsPermissions: true,
    },
  });

  if (!play || !play.isPublished || !play.acceptsPermissions) notFound();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-serif font-bold text-gray-900">
        上演許可申請
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        「{play.title}」の上演許可を申請します。
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
