/**
 * GET    /api/attachments/[id]: 認可チェック後、配信URLにリダイレクト
 * DELETE /api/attachments/[id]: アップロード後5分以内なら削除可
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAttachmentUrl, deleteAttachment } from "@/lib/attachment-storage";

const DELETE_WINDOW_MS = 5 * 60 * 1000;

async function checkParticipant(attachmentId: string, userId: string) {
  const attachment = await prisma.paletteAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      message: { include: { thread: { include: { permission: { select: { applicantId: true, play: { select: { authorId: true } } } } } } } },
      permission: { select: { applicantId: true, play: { select: { authorId: true } } } },
    },
  });
  if (!attachment) return null;

  // アップロード本人は常に閲覧可（未紐付けの場合も含む）
  if (attachment.uploaderId === userId) return attachment;

  // 紐付け先のスレッド/申請の参加者なら閲覧可
  const ownerThreadPerm = attachment.message?.thread.permission ?? attachment.permission;
  if (!ownerThreadPerm) return null;
  const isParticipant =
    ownerThreadPerm.applicantId === userId ||
    ownerThreadPerm.play.authorId === userId;
  if (!isParticipant) return null;
  return attachment;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  const attachment = await checkParticipant(id, session.user.id);
  if (!attachment) {
    return NextResponse.json({ error: "not found or forbidden" }, { status: 404 });
  }
  const url = await getAttachmentUrl(attachment.s3Key);
  // S3 は絶対URL（presigned）、local は相対パス。後者はリクエストURLを基準に絶対化。
  const absolute = url.startsWith("http") ? url : new URL(url, req.url).toString();
  return NextResponse.redirect(absolute, { status: 302 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  const attachment = await prisma.paletteAttachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (attachment.uploaderId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (Date.now() - attachment.createdAt.getTime() > DELETE_WINDOW_MS) {
    return NextResponse.json(
      { error: "削除可能な期間（5分）を過ぎています" },
      { status: 400 }
    );
  }

  await prisma.paletteAttachment.delete({ where: { id } });
  await deleteAttachment(attachment.s3Key);
  return NextResponse.json({ success: true });
}
