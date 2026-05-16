"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { createPlayDraft } from "@/actions/plays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuickStartEditor() {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleStart = () => {
    startTransition(async () => {
      await createPlayDraft(title);
    });
  };

  return (
    <div className="mb-8 rounded-lg border border-pink-200 bg-pink-50/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Pencil className="h-4 w-4 text-pink-500" />
        <h2 className="text-sm font-medium text-gray-900">
          エディタですぐ書き始める
        </h2>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        タイトルだけ入力して下書きを作成し、すぐにエディタを開きます。詳細はあとから編集できます。
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="タイトル（例: 無題の作品）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleStart();
            }
          }}
        />
        <Button type="button" onClick={handleStart} disabled={isPending}>
          {isPending ? "作成中..." : "エディタを開く"}
        </Button>
      </div>
    </div>
  );
}
