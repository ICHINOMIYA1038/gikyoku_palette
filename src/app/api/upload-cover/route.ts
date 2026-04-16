/**
 * POST /api/upload-cover
 *
 * 作品カバー画像のアップロード。multipart/form-data で受け取り、
 * attachment-storage 経由で保存（dev: local /tmp、本番: S3）。
 * 旧 presigned-URL 方式から server-side 受信に統一。
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveAttachment, getPublicUrl } from "@/lib/attachment-storage";

const ACCEPT = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "fileが必要です" }, { status: 400 });
  }
  if (!ACCEPT.has(file.type)) {
    return NextResponse.json(
      { error: "JPEG / PNG / WebP のみ対応しています" },
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
    folder: `palette/covers/${session.user.id}`,
  });

  return NextResponse.json({ imageUrl: getPublicUrl(key) });
}
