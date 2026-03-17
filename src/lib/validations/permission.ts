import { z } from "zod";

export const permissionFormSchema = z
  .object({
    organizationName: z
      .string()
      .min(1, "団体名を入力してください")
      .max(200),
    representativeName: z
      .string()
      .min(1, "代表者名を入力してください")
      .max(100),
    performanceTitle: z
      .string()
      .min(1, "公演名を入力してください")
      .max(200),
    startDate: z.string().min(1, "公演開始日を入力してください"),
    endDate: z.string().min(1, "公演終了日を入力してください"),
    venueName: z
      .string()
      .min(1, "会場名を入力してください")
      .max(200),
    venueLocation: z
      .string()
      .min(1, "会場所在地を入力してください")
      .max(300),
    expectedAudience: z.coerce
      .number()
      .int()
      .positive("想定観客数を入力してください"),
    ticketType: z.enum(["paid", "free"], {
      message: "チケット料金区分を選択してください",
    }),
    numPerformances: z.coerce
      .number()
      .int()
      .positive("上演回数を入力してください"),
    applicantMessage: z.string().max(2000).optional(),
  })
  .refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    {
      message: "終了日は開始日以降にしてください",
      path: ["endDate"],
    }
  );

export type PermissionFormValues = z.infer<typeof permissionFormSchema>;
