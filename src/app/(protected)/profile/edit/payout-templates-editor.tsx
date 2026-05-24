"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star, Edit2, X, Check } from "lucide-react";
import {
  createPayoutTemplate,
  updatePayoutTemplate,
  deletePayoutTemplate,
  type PayoutTemplate,
} from "@/actions/payout-templates";

export function PayoutTemplatesEditor({ initial }: { initial: PayoutTemplate[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const handleSubmit = (id: string | "new") => async (formData: FormData) => {
    setError(null);
    const res =
      id === "new"
        ? await createPayoutTemplate(formData)
        : await updatePayoutTemplate(id, formData);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setEditingId(null);
    startTransition(refresh);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("このテンプレートを削除しますか？")) return;
    startTransition(async () => {
      const res = await deletePayoutTemplate(id);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      refresh();
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {initial.length === 0 && editingId !== "new" && (
        <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          テンプレート未登録
        </div>
      )}

      <ul className="space-y-2">
        {initial.map((t) =>
          editingId === t.id ? (
            <li key={t.id}>
              <TemplateForm
                template={t}
                onSubmit={handleSubmit(t.id)}
                onCancel={() => setEditingId(null)}
                disabled={isPending}
              />
            </li>
          ) : (
            <li
              key={t.id}
              className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.label}</p>
                  {t.isDefault && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-pink-50 px-1.5 py-0.5 text-[10px] font-medium text-pink-700">
                      <Star className="h-2.5 w-2.5" fill="currentColor" /> デフォルト
                    </span>
                  )}
                </div>
                <pre className="mt-1 whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-600">
                  {t.content}
                </pre>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(t.id)}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  aria-label="編集"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  disabled={isPending}
                  className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label="削除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      {editingId === "new" ? (
        <TemplateForm
          onSubmit={handleSubmit("new")}
          onCancel={() => setEditingId(null)}
          disabled={isPending}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditingId("new");
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
        >
          <Plus className="h-4 w-4" />
          テンプレートを追加
        </button>
      )}
    </div>
  );
}

function TemplateForm({
  template,
  onSubmit,
  onCancel,
  disabled,
}: {
  template?: PayoutTemplate;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <form
      action={onSubmit}
      className="space-y-2 rounded-md border border-pink-200 bg-pink-50/40 p-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">ラベル *</label>
        <input
          name="label"
          defaultValue={template?.label ?? ""}
          required
          maxLength={50}
          placeholder="例: ゆうちょメイン"
          className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-200"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">振込先情報 *</label>
        <textarea
          name="content"
          defaultValue={template?.content ?? ""}
          required
          rows={5}
          maxLength={500}
          placeholder={`例:\n○○銀行 △△支店\n普通 1234567\nメイギ タロウ`}
          className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 font-sans text-sm focus:border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-200"
        />
      </div>
      <label className="flex items-center gap-1.5 text-xs text-gray-700">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={template?.isDefault ?? false}
          className="h-3.5 w-3.5 rounded border-gray-300"
        />
        デフォルトとして使う（承認画面で自動選択される）
      </label>
      <div className="flex gap-1.5 pt-1">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-md bg-pink-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-pink-600 disabled:opacity-50"
        >
          <Check className="h-3 w-3" /> 保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <X className="h-3 w-3" /> キャンセル
        </button>
      </div>
    </form>
  );
}
