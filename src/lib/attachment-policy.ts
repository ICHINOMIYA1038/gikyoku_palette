/**
 * 添付ファイルの受け入れポリシー。
 * UI とサーバの両方で同じ条件を使うため、ロジックを集約する。
 */

const KB = 1024;
const MB = 1024 * KB;

type Rule = {
  /** 受け入れる MIME prefix or fullmatch */
  matches: (mime: string) => boolean;
  maxSize: number; // bytes
  label: string;
};

const RULES: Rule[] = [
  {
    matches: (m) => m === "application/pdf",
    maxSize: 10 * MB,
    label: "PDF (最大10MB)",
  },
  {
    matches: (m) =>
      m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      m === "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    maxSize: 10 * MB,
    label: "Word/PowerPoint (最大10MB)",
  },
  {
    matches: (m) => m.startsWith("image/") && (m.endsWith("png") || m.endsWith("jpeg") || m.endsWith("jpg") || m.endsWith("webp")),
    maxSize: 5 * MB,
    label: "画像 (最大5MB)",
  },
  {
    matches: (m) => m === "video/mp4",
    maxSize: 50 * MB,
    label: "MP4動画 (最大50MB)",
  },
  {
    matches: (m) => m === "text/plain" || m === "text/markdown",
    maxSize: 1 * MB,
    label: "テキスト (最大1MB)",
  },
];

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateAttachment(file: { mimeType: string; fileSize: number; fileName: string }): ValidationResult {
  const rule = RULES.find((r) => r.matches(file.mimeType));
  if (!rule) {
    return {
      ok: false,
      reason: `未対応のファイル形式です (${file.mimeType || "unknown"})`,
    };
  }
  if (file.fileSize > rule.maxSize) {
    return {
      ok: false,
      reason: `ファイルサイズが上限（${formatBytes(rule.maxSize)}）を超えています`,
    };
  }
  return { ok: true };
}

export const ATTACHMENT_ACCEPT = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "text/plain",
  "text/markdown",
].join(",");

export const ATTACHMENT_MAX_PER_MESSAGE = 5;
export const ATTACHMENT_MAX_TOTAL_BYTES_PER_MESSAGE = 30 * MB;

export function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)}MB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(0)}KB`;
  return `${bytes}B`;
}
