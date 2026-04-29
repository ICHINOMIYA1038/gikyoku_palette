"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TagInput } from "./tag-input";
import { setPlayTagsForm } from "@/actions/tags";

type State = { error?: string; success?: boolean } | null;

type Props = {
  playId: string;
  initialTags: { name: string }[];
};

/**
 * 作品編集画面のタグ編集セクション。作品情報本体とは別に保存できる。
 */
export function TagsEditor({ playId, initialTags }: Props) {
  const router = useRouter();

  // playId を bind した Server Action を直接 form action に渡すことで
  // React 19 の useActionState が form submit を自動で POST に変換する。
  const boundAction = setPlayTagsForm.bind(null, playId);

  const [state, formAction, isPending] = useActionState<State, FormData>(
    boundAction as (prev: State, formData: FormData) => Promise<State>,
    null
  );

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state?.success, router]);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          タグ
        </label>
        <p className="mb-2 text-xs text-gray-500">
          自由記述のキーワードで作品を特徴付けられます。読者・劇団はタグで横断的に作品を探せます。
        </p>
        <TagInput defaultValue={initialTags.map((t) => t.name)} />
      </div>

      {state?.error && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-green-600">タグを保存しました</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center rounded-md bg-pink-500 px-4 text-xs font-medium text-white hover:bg-pink-600 disabled:opacity-50"
        >
          {isPending ? "保存中..." : "タグを保存"}
        </button>
      </div>
    </form>
  );
}
