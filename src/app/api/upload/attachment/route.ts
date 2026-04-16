/**
 * POST /api/upload/attachment
 *
 * multipart/form-data で1ファイル受け取り、ストレージに保存して
 * palette_attachments レコードを作成。messageId / permissionId はまだ未紐付けの状態で
 * id を返す。送信時に sendMessage / createPermission がこの id を参照して紐付ける。
 *
 * 認可: スレッド参加者であること（threadId / permissionId 経由でチェック）
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveAttachment } from "@/lib/attachment-storage";
import { validateAttachment } from "@/lib/attachment-policy";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const formData = await req.formData();
  const file = formData.get("file");
  const threadId = formData.get("threadId") as string | null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!threadId) {
    return NextResponse.json({ error: "threadId is required" }, { status: 400 });
  }

  // 認可: スレッドの参加者であること
  const thread = await prisma.paletteThread.findUnique({
    where: { id: threadId },
    include: { permission: { select: { applicantId: true, play: { select: { authorId: true } } } } },
  });
  if (!thread) {
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }
  const isParticipant =
    thread.permission.applicantId === userId ||
    thread.permission.play.authorId === userId;
  if (!isParticipant) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const validation = validateAttachment({
    mimeType: file.type,
    fileSize: file.size,
    fileName: file.name,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await saveAttachment({
    fileName: file.name,
    contentType: file.type,
    body: buffer,
  });

  const attachment = await prisma.paletteAttachment.create({
    data: {
      uploaderId: userId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      s3Key: key,
      // messageId / permissionId は送信時に紐付け
    },
  });

  return NextResponse.json({
    id: attachment.id,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
  });
}
