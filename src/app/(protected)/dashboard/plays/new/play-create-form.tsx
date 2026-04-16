"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlay } from "@/actions/plays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GenreSelector } from "@/components/plays/genre-selector";
import { CoverImageUpload } from "@/components/plays/cover-image-upload";
import { BodyTypeSelector } from "@/components/plays/body-type-selector";
import type { PaletteGenre } from "@prisma/client";
import { firstString, type FormValues } from "@/lib/form-values";

type FormState = {
  error?: string;
  success?: boolean;
  id?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: FormValues;
} | null;

export function PlayCreateForm({ genres }: { genres: PaletteGenre[] }) {
  const router = useRouter();
  const [coverImageUrl, setCoverImageUrl] = useState("");

  async function formAction(
    _prevState: FormState,
    formData: FormData
  ): Promise<FormState> {
    return await createPlay(formData);
  }

  const [state, action, isPending] = useActionState(formAction, null);

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard/plays");
    }
  }, [state?.success, router]);

  const v = state?.values;
  const sv = (key: string, fallback = ""): string => {
    const fromLast = firstString(v?.[key]);
    return fromLast !== undefined ? fromLast : fallback;
  };

  // 有料/無料のトグル: 前回入力値があればそれ、無ければ0
  const [feeAmount, setFeeAmount] = useState<number>(() => {
    const raw = firstString(v?.feeAmount);
    return raw ? Number(raw) || 0 : 0;
  });

  // validation 失敗のたびに form を再mountして defaultValue を反映
  const formKey = state?.values ? JSON.stringify(state.values).length : 0;

  return (
    <form action={action} className="space-y-0" key={formKey}>
      {/* カバー画像 */}
      <div className="pb-8 border-b border-gray-200">
        <CoverImageUpload onUpload={setCoverImageUrl} />
        <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
      </div>

      {/* 基本情報 */}
      <div className="py-8 border-b border-gray-200 space-y-5">
        <h2 className="text-lg font-serif font-semibold text-gray-900">
          基本情報
        </h2>
        <div className="space-y-2">
          <Label htmlFor="title">タイトル</Label>
          <Input id="title" name="title" defaultValue={sv("title")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="synopsis">あらすじ</Label>
          <Textarea
            id="synopsis"
            name="synopsis"
            rows={4}
            defaultValue={sv("synopsis")}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">本文</label>
          <BodyTypeSelector
            initialType={(firstString(v?.bodyType) as "text" | "pdf") || "text"}
            initialBody={firstString(v?.body) ?? ""}
            initialPdfUrl={firstString(v?.bodyPdfUrl) ?? null}
            initialOrientation={
              (firstString(v?.bodyOrientation) as "portrait" | "landscape") ||
              "portrait"
            }
          />
        </div>
      </div>

      {/* 上演情報 */}
      <div className="py-8 border-b border-gray-200 space-y-5">
        <h2 className="text-lg font-serif font-semibold text-gray-900">
          上演情報
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="durationMinutes">上演時間（分）</Label>
            <Input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              defaultValue={sv("durationMinutes")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="castTotal">出演人数（合計）</Label>
            <Input
              id="castTotal"
              name="castTotal"
              type="number"
              defaultValue={sv("castTotal")}
              required
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="castMale">男性</Label>
            <Input
              id="castMale"
              name="castMale"
              type="number"
              defaultValue={sv("castMale", "0")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="castFemale">女性</Label>
            <Input
              id="castFemale"
              name="castFemale"
              type="number"
              defaultValue={sv("castFemale", "0")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="castOther">不問</Label>
            <Input
              id="castOther"
              name="castOther"
              type="number"
              defaultValue={sv("castOther", "0")}
            />
          </div>
        </div>
      </div>

      {/* 料金・ジャンル */}
      <div className="py-8 border-b border-gray-200 space-y-5">
        <h2 className="text-lg font-serif font-semibold text-gray-900">
          料金・ジャンル
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="feeAmount">上演料（円、0で無料）</Label>
            <Input
              id="feeAmount"
              name="feeAmount"
              type="number"
              defaultValue={sv("feeAmount", "0")}
              min={0}
              onChange={(e) => setFeeAmount(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <input
              type="hidden"
              name="isFree"
              value={feeAmount === 0 ? "true" : "false"}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>ジャンル（最大5つ）</Label>
          <GenreSelector genres={genres} />
        </div>
      </div>

      {/* 送信 */}
      <div className="pt-8 flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "投稿中..." : "投稿する"}
        </Button>
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
    </form>
  );
}
