/**
 * POST /api/upload-pdf
 *
 * 台本 PDF のアップロード。multipart/form-data で受け取り、
 * attachment-storage 経由で保存（dev: local /tmp、本番: S3）。
 * MIME が "application/pdf" でなくても、拡張子 .pdf なら許容する
 * （macOSなどで古いPDFがMIME 未設定になるケースへの対応）。
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveAttachment, getPublicUrl } from "@/lib/attachment-storage";

const MAX_BYTES = 20 * 1024 * 1024;

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

  const isPdfMime = file.type === "application/pdf";
  const isPdfExt = file.name.toLowerCase().endsWith(".pdf");
  if (!isPdfMime && !isPdfExt) {
    return NextResponse.json(
      { error: "PDFファイルを選択してください" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "ファイルサイズは 20MB 以下にしてください" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await saveAttachment({
    fileName: file.name,
    contentType: "application/pdf",
    body: buffer,
    folder: `palette/scripts/${session.user.id}`,
  });

  return NextResponse.json({ pdfUrl: getPublicUrl(key) });
}
