"use client";

import { useActionState, useState } from "react";
import { updatePlay } from "@/actions/plays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GenreSelector } from "@/components/plays/genre-selector";
import { CoverImageUpload } from "@/components/plays/cover-image-upload";
import { BodyTypeSelector } from "@/components/plays/body-type-selector";
import { TagInput } from "@/components/plays/tag-input";
import type { PalettePlay, PaletteGenre } from "@prisma/client";
import { firstString, type FormValues } from "@/lib/form-values";

type FormState =
  | {
      error?: string;
      success?: boolean;
      fieldErrors?: Record<string, string[] | undefined>;
      /** validation失敗時、直前の入力値を復元するために返される */
      values?: FormValues;
    }
  | null;

type PlayWithGenres = PalettePlay & {
  genres: { genre: PaletteGenre }[];
};

type SeriesOption = { id: string; title: string };

export function PlayEditForm({
  play,
  genres,
  seriesList,
  initialTagNames,
}: {
  play: PlayWithGenres;
  genres: PaletteGenre[];
  seriesList: SeriesOption[];
  initialTagNames: string[];
}) {
  const [coverImageUrl, setCoverImageUrl] = useState(play.coverImageUrl || "");

  async function formAction(
    _prevState: FormState,
    formData: FormData
  ): Promise<FormState> {
    return await updatePlay(play.id, formData);
  }

  const [state, action, isPending] = useActionState(formAction, null);

  // validation 失敗時は直前入力を優先、そうでなければ DB の値を表示
  const v = state?.values;
  const sv = (key: string, fallback: string | number | null | undefined): string | number => {
    const fromLast = firstString(v?.[key]);
    if (fromLast !== undefined) return fromLast;
    return (fallback ?? "") as string | number;
  };

  // validation 失敗のたびに form を再mountし、新しい defaultValue を反映させる。
  // React 19 は action 後にフォームを defaultValue 基準にリセットするため、
  // 既にマウント済みの input には新しい defaultValue が適用されない問題を回避。
  const formKey = state?.values ? JSON.stringify(state.values).length : 0;

  return (
    <form action={action} key={formKey}>
      <Card>
        <CardHeader>
          <CardTitle>作品情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CoverImageUpload
            currentImageUrl={play.coverImageUrl}
            onUpload={setCoverImageUrl}
          />
          <input type="hidden" name="coverImageUrl" value={coverImageUrl} />

          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input id="title" name="title" defaultValue={sv("title", play.title)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="synopsis">あらすじ（任意）</Label>
            <Textarea id="synopsis" name="synopsis" defaultValue={sv("synopsis", play.synopsis)} rows={4} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">本文</label>
            <BodyTypeSelector
              playId={play.id}
              locked
              initialType={(firstString(v?.bodyType) as "text" | "pdf" | "editor") || (play.bodyType as "text" | "pdf" | "editor") || "text"}
              initialBody={firstString(v?.body) ?? play.body ?? ""}
              initialPdfUrl={firstString(v?.bodyPdfUrl) ?? play.bodyPdfUrl}
              initialOrientation={(firstString(v?.bodyOrientation) as "portrait" | "landscape") || (play.bodyOrientation as "portrait" | "landscape") || "portrait"}
              initialReadingDirection={(firstString(v?.readingDirection) as "ltr" | "rtl") || (play.readingDirection as "ltr" | "rtl") || "ltr"}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">上演時間（分）</Label>
              <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue={sv("durationMinutes", play.durationMinutes)} placeholder="未定" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="castTotal">出演人数（合計）</Label>
              <Input id="castTotal" name="castTotal" type="number" defaultValue={sv("castTotal", play.castTotal)} placeholder="未定" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="castMale">男性</Label>
              <Input id="castMale" name="castMale" type="number" defaultValue={sv("castMale", play.castMale)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="castFemale">女性</Label>
              <Input id="castFemale" name="castFemale" type="number" defaultValue={sv("castFemale", play.castFemale)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="castOther">不問</Label>
              <Input id="castOther" name="castOther" type="number" defaultValue={sv("castOther", play.castOther)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feeAmount">上演料（円、0で無料）</Label>
              <Input id="feeAmount" name="feeAmount" type="number" defaultValue={sv("feeAmount", play.feeAmount)} min="0" />
            </div>
            <div className="flex items-end">
              <input type="hidden" name="isFree" value={play.feeAmount === 0 ? "true" : "false"} />
            </div>
          </div>

          <div className="space-y-1.5 rounded-md border border-gray-200 bg-gray-50/50 p-3">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="acceptsPermissions"
                value="true"
                defaultChecked={play.acceptsPermissions ?? true}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span>
                <span className="font-medium text-gray-900">上演許可申請を受け付ける</span>
                <span className="mt-0.5 block text-[11px] text-gray-500">
                  オフにすると詳細ページに「現在受付停止中」と表示され、申請ボタンが無効化されます。
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <Label>ジャンル（最大5つ）</Label>
            <GenreSelector
              genres={genres}
              selectedIds={play.genres.map(g => g.genre.id)}
            />
          </div>

          <div className="space-y-2">
            <Label>タグ</Label>
            <p className="text-xs text-gray-500">
              自由記述のキーワードで作品を特徴付けられます。読者・劇団はタグで横断的に作品を探せます。
            </p>
            <TagInput defaultValue={initialTagNames} />
          </div>

          {seriesList.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="seriesId">シリーズ（任意）</Label>
                <select
                  id="seriesId"
                  name="seriesId"
                  defaultValue={sv("seriesId", play.seriesId) as string}
                  className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:border-pink-400 focus:ring-1 focus:ring-pink-200 outline-none bg-white"
                >
                  <option value="">シリーズに所属させない</option>
                  {seriesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seriesOrder">順番（任意）</Label>
                <Input
                  id="seriesOrder"
                  name="seriesOrder"
                  type="number"
                  min="1"
                  defaultValue={sv("seriesOrder", play.seriesOrder)}
                  placeholder="例: 1"
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "保存中..." : "保存する"}
          </Button>
          {state?.success && <p className="text-sm text-green-600">保存しました</p>}
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </CardFooter>
      </Card>
    </form>
  );
}
