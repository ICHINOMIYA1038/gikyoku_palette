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
import { FileText, FileType, PenLine, ArrowLeft, ArrowRight, Minus, Plus, Check } from "lucide-react";

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
    const options: {
      value: BodyType;
      label: string;
      desc: string;
      Icon: typeof FileText;
      desktopOnly?: boolean;
    }[] = [
      { value: "text", label: "テキスト入力", desc: "本文をそのまま貼り付けて公開する一番シンプルな方法", Icon: FileText },
      { value: "pdf", label: "PDFアップロード", desc: "既に組版済みのPDFをそのまま公開する", Icon: FileType },
      { value: "editor", label: "執筆エディタ", desc: "ト書き・台詞などの構造を持つ専用エディタで書く（自動保存）", Icon: PenLine, desktopOnly: true },
    ];
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-serif font-semibold text-gray-900">本文の形式を選んでください</h2>
          <p className="text-sm text-gray-500 mt-1">作成後は変更できません。</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {options.map(({ value, label, desc, Icon, desktopOnly }) => (
            <button
              key={value}
              type="button"
              onClick={() => setChosenType(value)}
              className={`${desktopOnly ? "hidden md:flex" : "flex"} flex-col items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-pink-400 hover:shadow-md transition-all`}
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
        <p className="md:hidden text-xs text-gray-500 leading-relaxed rounded-lg bg-gray-50 border border-gray-200 p-3">
          ※「執筆エディタ」は画面の広いPC・タブレットからのみご利用いただけます。
        </p>
      </div>
    );
  }

  const formKey = state?.values ? JSON.stringify(state.values).length : 0;

  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const isLastStep = currentIdx === STEPS.length - 1;
  const goNext = () => setStep(STEPS[Math.min(currentIdx + 1, STEPS.length - 1)].key);
  const goBack = () => setStep(STEPS[Math.max(currentIdx - 1, 0)].key);

  const progressPct = ((currentIdx + 1) / STEPS.length) * 100;

  return (
    <form action={action} className="space-y-6 pb-24 md:pb-0" key={formKey}>
      {/* プログレスバー */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-pink-600">
            STEP {currentIdx + 1} / {STEPS.length}
          </span>
          <span className="text-gray-500">{STEPS[currentIdx].label}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ステップ1: 基本情報 */}
      <div className={step === "basic" ? "space-y-5 rounded-2xl border border-gray-200 bg-white p-5 md:p-7 shadow-sm" : "hidden"}>
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
      <div className={step === "body" ? "space-y-4 rounded-2xl border border-gray-200 bg-white p-5 md:p-7 shadow-sm" : "hidden"}>
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
      <div className={step === "performance" ? "space-y-6 rounded-2xl border border-gray-200 bg-white p-5 md:p-7 shadow-sm" : "hidden"}>
        <div>
          <h2 className="text-lg font-serif font-semibold text-gray-900">上演情報</h2>
          <p className="text-sm text-gray-500 mt-1">まだ決まっていない項目は「未定」のままでOKです。</p>
        </div>

        {/* 上演時間 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="durationMinutes">上演時間（分）</Label>
            <TbdToggle checked={durationTbd} onChange={setDurationTbd} />
          </div>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={sv("durationMinutes")}
            disabled={durationTbd}
            value={durationTbd ? "" : undefined}
            placeholder={durationTbd ? "未定" : "例: 90"}
          />
        </div>

        {/* 出演人数 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="castTotal">出演人数（合計）</Label>
            <TbdToggle checked={castTbd} onChange={setCastTbd} />
          </div>
          <Stepper
            name="castTotal"
            id="castTotal"
            defaultValue={sv("castTotal")}
            disabled={castTbd}
            min={1}
            placeholder="例: 4"
          />
        </div>

        <div className={castTbd ? "opacity-50 pointer-events-none" : ""}>
          <p className="text-xs text-gray-500 mb-2">役の内訳（任意）</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <CastBox label="男性" name="castMale" defaultValue={sv("castMale")} disabled={castTbd} />
            <CastBox label="女性" name="castFemale" defaultValue={sv("castFemale")} disabled={castTbd} />
            <CastBox label="不問" name="castOther" defaultValue={sv("castOther")} disabled={castTbd} />
          </div>
        </div>
      </div>

      {/* ステップ4: 詳細・公開 */}
      <div className={step === "details" ? "space-y-6 rounded-2xl border border-gray-200 bg-white p-5 md:p-7 shadow-sm" : "hidden"}>
        <div>
          <h2 className="text-lg font-serif font-semibold text-gray-900">詳細・公開</h2>
          <p className="text-sm text-gray-500 mt-1">最後に、カバー画像やジャンルなどを設定して投稿します。</p>
        </div>

        <div className="space-y-2">
          <Label>カバー画像</Label>
          <CoverImageUpload onUpload={setCoverImageUrl} />
          <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="feeAmount">上演料（0で無料公開）</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-gray-400">¥</span>
            <Input
              id="feeAmount"
              name="feeAmount"
              type="number"
              inputMode="numeric"
              defaultValue={sv("feeAmount", "0")}
              min={0}
              className="pl-8"
              onChange={(e) => setFeeAmount(Number(e.target.value))}
            />
          </div>
          <input type="hidden" name="isFree" value={feeAmount === 0 ? "true" : "false"} />
          {feeAmount === 0 && (
            <p className="text-xs text-emerald-600">無料公開として登録されます</p>
          )}
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
                className="w-full h-11 md:h-10 rounded-md border border-gray-300 px-3 text-base md:text-sm focus:border-pink-400 focus:ring-1 focus:ring-pink-200 outline-none bg-white"
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

      {state?.error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      {/* ナビゲーション (モバイルはsticky bottom) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-4px_12px_rgba(0,0,0,0.04)] md:static md:bottom-auto md:bg-transparent md:p-0 md:pt-2 md:border-0 md:shadow-none">
        <div className="container mx-auto max-w-2xl flex items-center justify-between gap-3 md:max-w-none">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={goBack}
            disabled={currentIdx === 0}
            className="gap-2 flex-1 md:flex-none"
          >
            <ArrowLeft className="h-4 w-4" /> 戻る
          </Button>
          {isLastStep ? (
            <Button type="submit" size="lg" disabled={isPending} className="flex-1 md:flex-none">
              {isPending ? "投稿中..." : "投稿する"}
            </Button>
          ) : (
            <Button type="button" size="lg" onClick={goNext} className="gap-2 flex-1 md:flex-none">
              次へ <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

function TbdToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
        checked
          ? "border-pink-500 bg-pink-500 text-white shadow-sm"
          : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
          checked
            ? "border-white bg-white text-pink-500"
            : "border-gray-300 bg-white"
        }`}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      未定にする
    </button>
  );
}

function Stepper({
  id,
  name,
  defaultValue,
  disabled,
  min = 0,
  placeholder,
}: {
  id?: string;
  name: string;
  defaultValue: string;
  disabled?: boolean;
  min?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useState<string>(defaultValue);
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : min;
  const dec = () => setValue(String(Math.max(min, safe - 1)));
  const inc = () => setValue(String(safe + 1));
  return (
    <div className="flex items-stretch w-full max-w-[260px] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || safe <= min}
        aria-label="減らす"
        className="flex h-12 w-12 items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        value={disabled ? "" : value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder={disabled ? "未定" : placeholder}
        className="flex-1 min-w-0 h-12 border-0 bg-transparent text-center text-base font-medium outline-none disabled:opacity-60"
      />
      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        aria-label="増やす"
        className="flex h-12 w-12 items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function CastBox({
  label,
  name,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue: string;
  disabled?: boolean;
}) {
  return (
    <label className="block rounded-xl border border-gray-200 bg-gray-50/50 p-3">
      <span className="block text-xs text-gray-500 mb-1.5">{label}</span>
      <Stepper name={name} defaultValue={defaultValue} disabled={disabled} min={0} placeholder="0" />
    </label>
  );
}
