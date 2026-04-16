import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EditPermissionForm } from "./edit-form";

export const metadata = { title: "申請内容を編集" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/**
 * 修正依頼を受けた申請者が、内容を編集して再提出するページ。
 * status=revision_requested のとき以外はアクセス不可。
 */
export default async function EditPermissionPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const permission = await prisma.palettePermission.findUnique({
    where: { id },
    include: {
      play: { select: { title: true, authorId: true } },
      thread: { select: { id: true } },
    },
  });
  if (!permission) notFound();
  if (permission.applicantId !== session.user.id) notFound();
  if (permission.status !== "revision_requested") {
    redirect(permission.thread ? `/threads/${permission.thread.id}` : "/permissions");
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">申請内容を編集</h1>
      <p className="mb-2 text-sm text-muted-foreground">
        「{permission.play.title}」の申請を修正して再提出します
      </p>
      {permission.revisionReason && (
        <div className="mb-6 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
          <p className="mb-1 text-xs font-medium text-orange-700">作家からの修正依頼</p>
          <p className="whitespace-pre-wrap">{permission.revisionReason}</p>
        </div>
      )}
      <EditPermissionForm
        permissionId={permission.id}
        threadId={permission.thread?.id ?? null}
        defaultValues={{
          organizationName: permission.organizationName,
          representativeName: permission.representativeName,
          performanceTitle: permission.performanceTitle,
          startDate: permission.startDate.toISOString().slice(0, 10),
          endDate: permission.endDate.toISOString().slice(0, 10),
          venueName: permission.venueName,
          venueLocation: permission.venueLocation,
          expectedAudience: permission.expectedAudience,
          ticketType: permission.ticketType as "free" | "paid",
          numPerformances: permission.numPerformances,
        }}
      />
    </div>
  );
}
