import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_BUCKET = process.env.AWS_S3_BUCKET || "gikyokutosyokan-public";
const S3_REGION = process.env.AWS_REGION || "ap-northeast-1";

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId:
      process.env.S3_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY || "",
    secretAccessKey:
      process.env.S3_AWS_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      "",
  },
});

export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const imageUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
  return { uploadUrl, imageUrl };
}
