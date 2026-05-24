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
import { FileText, FileType, PenLine, ArrowLeft, ArrowRight } from "lucide-react";

type BodyType = "text" | "pdf" | "editor";

type FormState = {
  error?: string;
  success?: boolean;
  id?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: FormValues;
} | null;

type SeriesOption = { id: string; title: string };

const STEPS = [
  { key: "basic", label: "タイトル" },
  { key: "body", label: "本文" },
  { key: "performance", label: "上演情報" },
  { key: "details", label: "詳細・公開" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

export function PlayCreateForm({
  genres,
  seriesList,
}: {
  genres: PaletteGenre[];
  seriesList: SeriesOption[];
}) {
  const router = useRouter();
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [chosenType, setChosenType] = useState<BodyType | null>(null);
  const [step, setStep] = useState<StepKey>("basic");

  async function formAction(
    _prevState: FormState,
    formData: FormData
  ): Promise<FormState> {
    return await createPlay(formData);
  }

  const [state, action, isPending] = useActionState(formAction, null);

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard/plays?created=1");
    }
  }, [state?.success, router]);

  // バリデーション失敗時は該当ステップへジャンプ
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const fe = state?.fieldErrors;
    if (!fe) return;
    if (fe.title || fe.synopsis) setStep("basic");
    else if (fe.body || fe.bodyPdfUrl) setStep("body");
    else if (fe.durationMinutes || fe.castTotal || fe.castMale || fe.castFemale || fe.castOther) setStep("performance");
    else setStep("details");
  }, [state?.fieldErrors]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const v = state?.values;
  const sv = (key: string, fallback = ""): string => {
    const fromLast = firstString(v?.[key]);
    return fromLast !== undefined ? fromLast : fallback;
  };

  const [feeAmount, setFeeAmount] = useState<number>(() => {
    const raw = firstString(v?.feeAmount);
    return raw ? Number(raw) || 0 : 0;
  });

  // 「未定」状態
  const [durationTbd, setDurationTbd] = useState(() => !firstString(v?.durationMinutes));
  const [castTbd, setCastTbd] = useState(() => !firstString(v?.castTotal));

  // 形式選択画面
  if (!chosenType) {
    const options: { value: BodyType; label: string; desc: string; Icon: typeof FileText }[] = [
      { value: "text", label: "テキスト入力", desc: "本文をそのまま貼り付けて公開する一番シンプルな方法", Icon: FileText },
      { value: "pdf", label: "PDFアップロード", desc: "既に組版済みのPDFをそのまま公開する", Icon: FileType },
      { value: "editor", label: "執筆エディタ", desc: "ト書き・台詞などの構造を持つ専用エディタで書く（自動保存）", Icon: PenLine },
    ];
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-serif font-semibold text-gray-900">本文の形式を選んでください</h2>
          <p className="text-sm text-gray-500 mt-1">作成後は変更できません。</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {options.map(({ value, label, desc, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setChosenType(value)}
              className="flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-pink-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-pink-50">
                <Icon className="h-5 w-5 text-pink-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const formKey = state?.values ? JSON.stringify(state.values).length : 0;

  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const isLastStep = currentIdx === STEPS.length - 1;
  const goNext = () => setStep(STEPS[Math.min(currentIdx + 1, STEPS.length - 1)].key);
  const goBack = () => setStep(STEPS[Math.max(currentIdx - 1, 0)].key);

  return (
    <form action={action} className="space-y-8" key={formKey}>
      {/* ステップインジケータ */}
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const active = s.key === step;
          const done = i < currentIdx;
          return (
            <li key={s.key} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium shrink-0 ${
                  active
                    ? "bg-pink-500 text-white"
                    : done
                    ? "bg-pink-100 text-pink-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-xs ${active ? "text-gray-900 font-medium" : "text-gray-400"}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
            </li>
          );
        })}
      </ol>

      {/* ステップ1: 基本情報 */}
      <div className={step === "basic" ? "space-y-5" : "hidden"}>
        <div>
          <h2 className="text-lg font-serif font-semibold text-gray-900">タイトル & あらすじ</h2>
          <p className="text-sm text-gray-500 mt-1">まずは作品の入り口になる部分から。</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">タイトル</Label>
          <Input id="title" name="title" defaultValue={sv("title")} placeholder="無題のプロジェクト" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="synopsis">あらすじ（任意）</Label>
          <Textarea id="synopsis" name="synopsis" rows={5} defaultValue={sv("synopsis")} placeholder="後から書いてもOKです" />
        </div>
      </div>

      {/* ステップ2: 本文 */}
      <div className={step === "body" ? "space-y-3" : "hidden"}>
        <div>
          <h2 className="text-lg font-serif font-semibold text-gray-900">本文</h2>
          <p className="text-sm text-gray-500 mt-1">まだ書けていなくても大丈夫。空のままでも投稿でき、後から編集できます。</p>
        </div>
        <BodyTypeSelector
          locked
          initialType={(firstString(v?.bodyType) as BodyType) || chosenType}
          initialBody={firstString(v?.body) ?? ""}
          initialPdfUrl={firstString(v?.bodyPdfUrl) ?? null}
          initialOrientation={(firstString(v?.bodyOrientation) as "portrait" | "landscape") || "portrait"}
          initialReadingDirection={(firstString(v?.readingDirection) as "ltr" | "rtl") || "ltr"}
        />
      </div>

      {/* ステップ3: 上演情報 */}
      <div className={step === "performance" ? "space-y-5" : "hidden"}>
        <div>
          <h2 className="text-lg font-serif font-semibold text-gray-900">上演情報</h2>
          <p className="text-sm text-gray-500 mt-1">まだ決まっていない項目は「未定」のままでOKです。</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="durationMinutes">上演時間（分）</Label>
            <label className="text-xs text-gray-500 inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={durationTbd}
                onChange={(e) => setDurationTbd(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-pink-500 focus:ring-pink-400"
              />
              未定
            </label>
          </div>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            defaultValue={sv("durationMinutes")}
            disabled={durationTbd}
            value={durationTbd ? "" : undefined}
            placeholder={durationTbd ? "未定" : "例: 90"}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="castTotal">出演人数（合計）</Label>
            <label className="text-xs text-gray-500 inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={castTbd}
                onChange={(e) => setCastTbd(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-pink-500 focus:ring-pink-400"
              />
              未定
            </label>
          </div>
          <Input
            id="castTotal"
            name="castTotal"
            type="number"
            min={1}
            defaultValue={sv("castTotal")}
            disabled={castTbd}
            value={castTbd ? "" : undefined}
            placeholder={castTbd ? "未定" : "例: 4"}
          />
        </div>

        <div className={`grid gap-4 sm:grid-cols-3 ${castTbd ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="space-y-2">
            <Label htmlFor="castMale">男性</Label>
            <Input id="castMale" name="castMale" type="number" min={0} defaultValue={sv("castMale")} placeholder="未指定" disabled={castTbd} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="castFemale">女性</Label>
            <Input id="castFemale" name="castFemale" type="number" min={0} defaultValue={sv("castFemale")} placeholder="未指定" disabled={castTbd} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="castOther">不問</Label>
            <Input id="castOther" name="castOther" type="number" min={0} defaultValue={sv("castOther")} placeholder="未指定" disabled={castTbd} />
          </div>
        </div>
      </div>

      {/* ステップ4: 詳細・公開 */}
      <div className={step === "details" ? "space-y-6" : "hidden"}>
        <div>
          <h2 className="text-lg font-serif font-semibold text-gray-900">詳細・公開</h2>
          <p className="text-sm text-gray-500 mt-1">最後に、カバー画像やジャンルなどを設定して投稿します。</p>
        </div>

        <div className="space-y-2">
          <Label>カバー画像</Label>
          <CoverImageUpload onUpload={setCoverImageUrl} />
          <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
        </div>

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
            <input type="hidden" name="isFree" value={feeAmount === 0 ? "true" : "false"} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>ジャンル（最大5つ）</Label>
          <GenreSelector genres={genres} />
        </div>

        {seriesList.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="seriesId">シリーズ（任意）</Label>
              <select
                id="seriesId"
                name="seriesId"
                defaultValue={sv("seriesId", "")}
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:border-pink-400 focus:ring-1 focus:ring-pink-200 outline-none bg-white"
              >
                <option value="">シリーズに所属させない</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seriesOrder">順番（任意）</Label>
              <Input id="seriesOrder" name="seriesOrder" type="number" min="1" defaultValue={sv("seriesOrder", "")} placeholder="例: 1" />
            </div>
          </div>
        )}
      </div>

      {/* ナビゲーション */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={currentIdx === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> 戻る
        </Button>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {isLastStep ? (
          <Button type="submit" disabled={isPending}>
            {isPending ? "投稿中..." : "投稿する"}
          </Button>
        ) : (
          <Button type="button" onClick={goNext} className="gap-2">
            次へ <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
