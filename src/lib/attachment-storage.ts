/**
 * 添付ファイルストレージ抽象化レイヤー。
 *
 * - **本番**: AWS S3 を使う（presigned PUT/GET）
 * - **dev**: 環境変数が無いため OS の一時ディレクトリ + 静的配信で代替
 *
 * 上位コードはこの関数だけ使う。S3 か local か意識しない。
 */

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const LOCAL_DIR = "/tmp/palette-uploads";

function isS3Configured(): boolean {
  return !!(
    (process.env.AWS_S3_BUCKET || process.env.S3_BUCKET) &&
    (process.env.S3_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY) &&
    (process.env.S3_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)
  );
}

let s3Client: S3Client | null = null;
function getS3() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || process.env.S3_REGION || "ap-northeast-1",
      credentials: {
        accessKeyId: (process.env.S3_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY)!,
        secretAccessKey: (process.env.S3_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)!,
      },
    });
  }
  return s3Client;
}

/**
 * 任意の Buffer/Uint8Array を保存し、ストレージキーを返す。
 * key は <folder>/{uuid}{.ext} 形式で生成する（folder 既定: palette/attachments）。
 */
export async function saveAttachment(opts: {
  fileName: string;
  contentType: string;
  body: Buffer | Uint8Array;
  folder?: string;
}): Promise<{ key: string }> {
  const ext = path.extname(opts.fileName);
  const folder = opts.folder ?? "palette/attachments";
  const key = `${folder}/${randomUUID()}${ext}`;

  if (isS3Configured()) {
    await getS3().send(
      new PutObjectCommand({
        Bucket: (process.env.AWS_S3_BUCKET || process.env.S3_BUCKET)!,
        Key: key,
        Body: opts.body,
        ContentType: opts.contentType,
      })
    );
  } else {
    await fs.mkdir(path.dirname(path.join(LOCAL_DIR, key)), { recursive: true });
    await fs.writeFile(path.join(LOCAL_DIR, key), opts.body);
  }
  return { key };
}

/**
 * 公開ファイル用 URL（avatar・cover など、有効期限なしで参照したいもの）。
 * S3: public bucket 想定の生 URL を返す（ACL設定の責務はインフラ側）。
 * local: 配信ルート /api/storage/{key} を返す。
 */
export function getPublicUrl(key: string): string {
  if (isS3Configured()) {
    const region = process.env.AWS_REGION || process.env.S3_REGION || "ap-northeast-1";
    const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
  return `/api/storage/${key}`;
}

/**
 * 取得用 URL を発行する。
 * - S3: presigned GET URL（有効期限指定可）
 * - local: /api/storage/{key} を返す（dev 用配信ルート）
 */
export async function getAttachmentUrl(
  key: string,
  expiresInSec = 900
): Promise<string> {
  if (isS3Configured()) {
    return getSignedUrl(
      getS3(),
      new GetObjectCommand({
        Bucket: (process.env.AWS_S3_BUCKET || process.env.S3_BUCKET)!,
        Key: key,
      }),
      { expiresIn: expiresInSec }
    );
  }
  return `/api/storage/${key}`;
}

/** 指定 key のファイルを実体ごと削除 */
export async function deleteAttachment(key: string): Promise<void> {
  if (isS3Configured()) {
    await getS3().send(
      new DeleteObjectCommand({
        Bucket: (process.env.AWS_S3_BUCKET || process.env.S3_BUCKET)!,
        Key: key,
      })
    );
  } else {
    try {
      await fs.unlink(path.join(LOCAL_DIR, key));
    } catch {
      // file already gone
    }
  }
}

/** local 配信用にファイルを直接読み出す（/api/storage 経由） */
export async function readLocalAttachment(key: string): Promise<Buffer> {
  return fs.readFile(path.join(LOCAL_DIR, key));
}
