"use client";

import { useState, useTransition } from "react";
import { ExternalLink, PenLine } from "lucide-react";
import { unlinkEditorSource } from "@/actions/plays";

const EDITOR_URL = "https://editor.gikyokutosyokan.com";

/**
 * 戯曲エディタから取り込んだ作品の本文欄。本文の正本はエディタにあるので、ここでは直さない。
 * 連携を解除すると、以後はテキストの作品としてパレットで本文を直せる
 */
export function EditorSourcePanel({ playId, sourceScriptId }: { playId: string; sourceScriptId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-pink-50">
          <PenLine className="h-5 w-5 text-pink-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">本文は戯曲エディタで直します</p>
          <p className="text-xs text-gray-500">
            エディタで書き直したあと、エディタの「投稿した本文を更新」を押すと、この作品に反映されます。
          </p>
        </div>
      </div>
      <a
        href={`${EDITOR_URL}/scripts/${encodeURIComponent(sourceScriptId)}`}
        className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        戯曲エディタで本文を編集
        <ExternalLink className="h-4 w-4" />
      </a>

      <div className="border-t border-gray-100 pt-4 text-xs text-gray-500">
        {confirming ? (
          <div className="space-y-2">
            <p>
              連携を解除すると、この作品はテキストの作品になり、本文をパレットで直せるようになります。エディタの「投稿した本文を更新」は使えなくなります。エディタの原稿は消えません。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await unlinkEditorSource(playId);
                    if (r.success) location.reload();
                    else setError("解除できませんでした。時間をおいてお試しください。");
                  })
                }
                className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                連携を解除する
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="px-3 py-1.5 text-gray-500 hover:underline">
                やめる
              </button>
            </div>
            {error && <p className="text-red-600">{error}</p>}
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="hover:underline">
            エディタとの連携を解除する
          </button>
        )}
      </div>
    </div>
  );
}
