import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl } from "@/lib/s3";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { contentType } = body as { contentType?: string };

  if (contentType !== "application/pdf") {
    return NextResponse.json(
      { error: "PDFファイルのみ対応しています" },
      { status: 400 }
    );
  }

  const timestamp = Date.now();
  const key = `palette-scripts/${session.user.id}-${timestamp}.pdf`;

  try {
    const { uploadUrl, imageUrl: pdfUrl } = await getPresignedUploadUrl(
      key,
      contentType
    );
    return NextResponse.json({ uploadUrl, pdfUrl });
  } catch (error) {
    console.error("Failed to generate presigned URL:", error);
    return NextResponse.json(
      { error: "アップロードURLの生成に失敗しました" },
      { status: 500 }
    );
  }
}
