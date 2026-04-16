/**
 * Dev only ローカル添付ファイル配信。
 *
 * 本番では S3 の presigned GET URL に直接リダイレクトされるため、
 * このハンドラーは呼ばれない。NODE_ENV=development 以外では 404。
 *
 * 認可は呼び出し元 (/api/attachments/[id]) で済んでいる前提。
 * （直叩きされるとファイルが見えるが、key は cuid + uuid で実質予測不能）
 */

import { NextResponse } from "next/server";
import path from "path";
import { readLocalAttachment } from "@/lib/attachment-storage";

const EXT_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }
  const { key } = await params;
  const fullKey = key.join("/");
  try {
    const buf = await readLocalAttachment(fullKey);
    const ext = path.extname(fullKey).toLowerCase();
    const contentType = EXT_TO_MIME[ext] || "application/octet-stream";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=900",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
