"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createSeries, updateSeries } from "@/actions/series";

type State = {
  error?: string;
  success?: boolean;
  id?: string;
} | null;

type Props =
  | {
      mode: "create";
      seriesId?: never;
      initial?: never;
    }
  | {
      mode: "edit";
      seriesId: string;
      initial: {
        title: string;
        description: string | null;
        coverImageUrl: string | null;
      };
    };

export function SeriesForm(props: Props) {
  const router = useRouter();

  async function action(_prev: State, formData: FormData): Promise<State> {
    const res =
      props.mode === "edit"
        ? await updateSeries(props.seriesId, formData)
        : await createSeries(formData);

    if ("success" in res && res.success) {
      if (props.mode === "create" && "id" in res && res.id) {
        router.push(`/dashboard/series/${res.id}`);
      } else {
        router.refresh();
      }
    }
    return res as State;
  }

  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          シリーズ名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          defaultValue={props.mode === "edit" ? props.initial.title : ""}
          required
          maxLength={200}
          className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:border-pink-400 focus:ring-1 focus:ring-pink-200 outline-none"
          placeholder="例: 〇〇三部作"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          説明 <span className="text-xs text-gray-400 font-normal">(任意)</span>
        </label>
        <textarea
          name="description"
          defaultValue={props.mode === "edit" ? props.initial.description ?? "" : ""}
          rows={4}
          maxLength={2000}
          className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-pink-400 focus:ring-1 focus:ring-pink-200 outline-none"
          placeholder="シリーズの背景や構成についての紹介文"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          カバー画像URL <span className="text-xs text-gray-400 font-normal">(任意)</span>
        </label>
        <input
          type="text"
          name="coverImageUrl"
          defaultValue={props.mode === "edit" ? props.initial.coverImageUrl ?? "" : ""}
          className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:border-pink-400 focus:ring-1 focus:ring-pink-200 outline-none"
          placeholder="/api/storage/... または https://..."
        />
      </div>

      {state?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center rounded-md bg-pink-500 px-5 text-sm font-medium text-white hover:bg-pink-600 disabled:opacity-50 transition-colors"
        >
          {isPending
            ? "保存中..."
            : props.mode === "edit"
            ? "保存"
            : "作成する"}
        </button>
      </div>
    </form>
  );
}
