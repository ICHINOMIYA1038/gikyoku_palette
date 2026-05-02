"use client";

import { useState } from "react";
import { PlayEditor } from "@/components/editor/play-editor";
import { CanvasEditor } from "@/components/editor/canvas-editor";

type Props = {
  playId: string;
  initialContent: Record<string, unknown> | null;
};

type Mode = "horizontal" | "script";

export function EditorSwitcher({ playId, initialContent }: Props) {
  const [mode, setMode] = useState<Mode>("script");

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-1 bg-white border-b border-gray-200 px-4 py-1">
        <button
          type="button"
          onClick={() => setMode("horizontal")}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            mode === "horizontal"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          横書き
        </button>
        <button
          type="button"
          onClick={() => setMode("script")}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            mode === "script"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          台本（縦書き）
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {mode === "horizontal" ? (
          <PlayEditor playId={playId} initialContent={initialContent} />
        ) : (
          <CanvasEditor playId={playId} initialContent={initialContent} />
        )}
      </div>
    </div>
  );
}
