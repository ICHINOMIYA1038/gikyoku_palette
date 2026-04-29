import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    S3_BUCKET: process.env.S3_BUCKET ? "SET" : "EMPTY",
    S3_REGION: process.env.S3_REGION ? "SET" : "EMPTY",
    S3_AWS_ACCESS_KEY: process.env.S3_AWS_ACCESS_KEY ? "SET" : "EMPTY",
    S3_AWS_SECRET_ACCESS_KEY: process.env.S3_AWS_SECRET_ACCESS_KEY ? "SET" : "EMPTY",
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET ? "SET" : "EMPTY",
    AWS_REGION: process.env.AWS_REGION ? "SET" : "EMPTY",
  });
}
