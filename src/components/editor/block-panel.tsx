"use client";

import { useState } from "react";
import {
  type PlayDocument,
  type CursorPosition,
  type Block,
  blockLabel,
} from "@/lib/editor/play-document";
import { GripVertical, Plus, X } from "lucide-react";

type Props = {
  doc: PlayDocument;
  cursor: CursorPosition;
  onMoveBlock: (fromIndex: number, direction: "up" | "down") => void;
  onReorderBlock: (fromIndex: number, toIndex: number) => void;
  onDeleteBlock: (index: number) => void;
  onChangeBlockType: (index: number, newType: Block["type"]) => void;
  onSelectBlock: (index: number) => void;
  onInsertBlock: (block: Block) => void;
  onUpdateBlock: (index: number, updater: (b: Block) => Block) => void;
};

const INSERT_TYPES: { type: Block["type"]; label: string; build: () => Block }[] = [
  { type: "title", label: "タイトル", build: () => ({ type: "title", title: "", author: "" }) },
  { type: "castList", label: "登場人物", build: () => ({ type: "castList", characters: [] }) },
  { type: "sceneHeading", label: "場面", build: () => ({ type: "sceneHeading", text: "" }) },
  { type: "serif", label: "セリフ", build: () => ({ type: "serif", speaker: "", speech: "" }) },
  { type: "togaki", label: "ト書き", build: () => ({ type: "togaki", text: "" }) },
  { type: "endMark", label: "終幕", build: () => ({ type: "endMark", text: "おわり" }) },
];

function blockPreview(b: Block): string {
  switch (b.type) {
    case "title": return b.title || "(無題)";
    case "castList": return b.characters.map((c) => c.name).join("、") || "(未入力)";
    case "serif": return `${b.speaker || "?"}: ${b.speech?.slice(0, 20) || ""}`;
    case "togaki": return b.text?.slice(0, 24) || "(未入力)";
    case "sceneHeading": return b.text || "(未入力)";
    case "endMark": return b.text || "おわり";
    default: return "";
  }
}

export function BlockPanel({
  doc,
  cursor,
  onReorderBlock,
  onSelectBlock,
  onInsertBlock,
  onUpdateBlock,
}: Props) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const bi = cursor.blockIndex;
  const currentBlock = doc.blocks[bi];

  return (
    <div className="flex w-60 shrink-0 flex-col border-l border-gray-200 bg-white text-xs">
      {/* 登場人物編集（castListが選択中の時のみ） */}
      {currentBlock?.type === "castList" && (
        <div className="border-b border-gray-100 p-3">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-gray-400">登場人物</p>
          <div className="space-y-1">
            {currentBlock.characters.map((c, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    onUpdateBlock(bi, (b) => {
                      if (b.type !== "castList") return b;
                      const characters = b.characters.map((x, i) => i === idx ? { ...x, name } : x);
                      return { ...b, characters };
                    });
                  }}
                  className="flex-1 rounded border border-gray-200 px-2 py-1 text-[11px] focus:border-blue-300 focus:outline-none"
                  placeholder="人物名"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateBlock(bi, (b) => {
                      if (b.type !== "castList") return b;
                      return { ...b, characters: b.characters.filter((_, i) => i !== idx) };
                    });
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="削除"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                onUpdateBlock(bi, (b) => {
                  if (b.type !== "castList") return b;
                  return { ...b, characters: [...b.characters, { name: "", description: "" }] };
                });
              }}
              className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-gray-300 px-2 py-1.5 text-[11px] text-gray-500 hover:bg-gray-50"
            >
              <Plus className="h-3 w-3" />
              人物を追加
            </button>
          </div>
        </div>
      )}

      {/* 挿入セクション */}
      <div className="border-b border-gray-100 p-3">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-gray-400">挿入</p>
        <div className="grid grid-cols-2 gap-1">
          {INSERT_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onInsertBlock(t.build())}
              className="flex items-center gap-1 rounded bg-gray-50 px-2 py-1.5 text-[11px] text-gray-700 hover:bg-gray-100"
              title={`現在のブロックの下に${t.label}を追加`}
            >
              <Plus className="h-3 w-3 text-gray-400" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ブロック一覧（ナビゲーション） */}
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-gray-400">ブロック一覧</p>
          <span className="text-[10px] text-gray-400">{doc.blocks.length}</span>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto">
          {doc.blocks.map((b, i) => {
            const isActive = i === bi;
            return (
              <div
                key={i}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(i));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverIndex(i);
                }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
                  if (!isNaN(from) && from !== i) onReorderBlock(from, i);
                  setDragOverIndex(null);
                }}
                onDragEnd={() => setDragOverIndex(null)}
                onClick={() => onSelectBlock(i)}
                className={`group flex cursor-grab items-start gap-1.5 rounded px-1.5 py-1.5 transition-colors active:cursor-grabbing ${
                  dragOverIndex === i
                    ? "border border-blue-300 bg-blue-100"
                    : isActive
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                }`}
              >
                <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-gray-300 opacity-0 group-hover:opacity-100" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-gray-400">{i + 1}</span>
                    <span className={`text-[11px] ${isActive ? "font-medium text-blue-700" : "text-gray-700"}`}>
                      {blockLabel(b.type)}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-gray-500">{blockPreview(b)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
