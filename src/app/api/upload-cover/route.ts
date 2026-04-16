import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl } from "@/lib/s3";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { contentType } = body as { contentType?: string };

  if (!contentType || !ALLOWED_TYPES[contentType]) {
    return NextResponse.json(
      { error: "対応していないファイル形式です。JPEG、PNG、WebPのみ対応しています。" },
      { status: 400 }
    );
  }

  const ext = ALLOWED_TYPES[contentType];
  const timestamp = Date.now();
  const key = `palette-covers/${session.user.id}-${timestamp}.${ext}`;

  try {
    const { uploadUrl, imageUrl } = await getPresignedUploadUrl(key, contentType);
    return NextResponse.json({ uploadUrl, imageUrl });
  } catch (error) {
    console.error("Failed to generate presigned URL:", error);
    return NextResponse.json(
      { error: "アップロードURLの生成に失敗しました" },
      { status: 500 }
    );
  }
}
