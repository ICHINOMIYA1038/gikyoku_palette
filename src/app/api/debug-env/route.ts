import { NextResponse } from "next/server";
import { getPublicUrl } from "@/lib/attachment-storage";

export async function GET() {
  const testUrl = getPublicUrl("test/sample.pdf");
  return NextResponse.json({
    testUrl,
    isS3: !testUrl.startsWith("/api/storage"),
    S3_BUCKET: process.env.S3_BUCKET ? "SET" : "EMPTY",
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET ? "SET" : "EMPTY",
    S3_AWS_ACCESS_KEY: process.env.S3_AWS_ACCESS_KEY ? "SET" : "EMPTY",
    S3_AWS_SECRET_ACCESS_KEY: process.env.S3_AWS_SECRET_ACCESS_KEY ? "SET" : "EMPTY",
  });
}
