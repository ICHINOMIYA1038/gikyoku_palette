import { z } from "zod";

export const seriesSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  coverImageUrl: z
    .string()
    .refine(
      (v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v),
      "URLの形式が不正です"
    )
    .optional()
    .or(z.literal("")),
});

export type SeriesInput = z.infer<typeof seriesSchema>;
