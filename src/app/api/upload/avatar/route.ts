/**
 * POST /api/upload/avatar
 *
 * 自分のアバター画像をアップロードして User.avatarUrl を更新する。
 * - 受け入れ: image/png, image/jpeg, image/webp、最大 5MB
 * - dev: ローカル /api/storage/{key} を返す
 * - 本番: S3 public URL を返す（バケット側で public-read 推奨）
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveAttachment, getPublicUrl } from "@/lib/attachment-storage";

const ACCEPT = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!ACCEPT.has(file.type)) {
    return NextResponse.json(
      { error: "PNG / JPEG / WebP のみアップロードできます" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "ファイルサイズは 5MB 以下にしてください" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await saveAttachment({
    fileName: file.name,
    contentType: file.type,
    body: buffer,
    folder: `palette/avatars/${userId}`,
  });

  const avatarUrl = getPublicUrl(key);

  await prisma.$executeRaw`
    UPDATE "User" SET "avatarUrl" = ${avatarUrl} WHERE id = ${userId}
  `;

  return NextResponse.json({ avatarUrl });
}
