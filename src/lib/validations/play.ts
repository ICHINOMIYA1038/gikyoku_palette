/**
 * 作品（PalettePlay）の作成・編集バリデーションスキーマ。
 *
 * アップロード API は dev では "/api/storage/..." 相対パス、
 * 本番では "https://..." 絶対URL を返すため、両方を許容する。
 */
import { z } from "zod";

const uploadedUrl = z
  .string()
  .refine(
    (v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v),
    "URLの形式が不正です"
  );

export const playSchema = z.object({
  title: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v : "無題のプロジェクト")),
  synopsis: z.string().optional().default(""),
  body: z.string().max(500000, "本文は50万文字以内にしてください").optional().default(""),
  bodyType: z.enum(["text", "pdf", "editor"]).default("text"),
  bodyPdfUrl: uploadedUrl.optional().or(z.literal("")),
  bodyOrientation: z.enum(["portrait", "landscape"]).default("portrait"),
  readingDirection: z.enum(["ltr", "rtl"]).default("ltr"),
  durationMinutes: z.coerce.number().int().positive().optional(),
  castTotal: z.coerce.number().int().positive().optional(),
  castMale: z.coerce.number().int().min(0).optional(),
  castFemale: z.coerce.number().int().min(0).optional(),
  castOther: z.coerce.number().int().min(0).optional(),
  feeAmount: z.coerce.number().int().min(0),
  isFree: z.coerce.boolean(),
  acceptsPermissions: z.coerce.boolean().default(true),
  coverImageUrl: uploadedUrl.optional().or(z.literal("")),
  seriesId: z.string().optional(),
  seriesOrder: z.coerce.number().int().positive().optional(),
});

export type PlayInput = z.infer<typeof playSchema>;

/**
 * FormData から playSchema 用の入力オブジェクトを組み立てる。
 * bodyType を切り替えたときに存在しない field（body / bodyPdfUrl）が
 * null になって "expected string, received null" で落ちるため、
 * ここでまとめて空文字・undefined に正規化する。
 */
export function readPlayInput(formData: FormData) {
  const s = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  const opt = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };
  return {
    title: s("title"),
    synopsis: s("synopsis"),
    body: s("body"),
    bodyType: opt("bodyType") || "text",
    bodyPdfUrl: opt("bodyPdfUrl"),
    bodyOrientation: opt("bodyOrientation") || "portrait",
    readingDirection: opt("readingDirection") || "ltr",
    durationMinutes: opt("durationMinutes"),
    castTotal: opt("castTotal"),
    castMale: opt("castMale"),
    castFemale: opt("castFemale"),
    castOther: opt("castOther"),
    feeAmount: opt("feeAmount") || "0",
    isFree: formData.get("isFree") === "true",
    // 値が無い場合（チェックボックス未送信）はデフォルト true 扱い
    acceptsPermissions: formData.has("acceptsPermissions")
      ? formData.get("acceptsPermissions") === "true" ||
        formData.get("acceptsPermissions") === "on"
      : true,
    coverImageUrl: opt("coverImageUrl"),
    seriesId: opt("seriesId"),
    seriesOrder: opt("seriesOrder"),
  };
}
