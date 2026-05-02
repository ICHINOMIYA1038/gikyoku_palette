"use client";

import {
  type PlayDocument,
  type CursorPosition,
  type Block,
  blockLabel,
} from "@/lib/editor/play-document";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";

type Props = {
  doc: PlayDocument;
  cursor: CursorPosition;
  onMoveBlock: (fromIndex: number, direction: "up" | "down") => void;
  onDeleteBlock: (index: number) => void;
  onChangeBlockType: (index: number, newType: Block["type"]) => void;
};

const CONVERTIBLE_TYPES: Block["type"][] = ["serif", "togaki", "sceneHeading", "setting"];

export function BlockPanel({
  doc,
  cursor,
  onMoveBlock,
  onDeleteBlock,
  onChangeBlockType,
}: Props) {
  const block = doc.blocks[cursor.blockIndex];
  if (!block) return null;

  const bi = cursor.blockIndex;
  const canMoveUp = bi > 0;
  const canMoveDown = bi < doc.blocks.length - 1;
  const canDelete = doc.blocks.length > 1 && block.type !== "title";
  const canConvert = CONVERTIBLE_TYPES.includes(block.type);

  // ブロック内容のプレビュー
  const preview = (() => {
    switch (block.type) {
      case "title":
        return block.title || "(タイトル未入力)";
      case "castList":
        return block.characters.map((c) => c.name).join("、") || "(登場人物未入力)";
      case "serif":
        return `${block.speaker || "?"}: ${block.speech?.slice(0, 30) || "..."}`;
      case "togaki":
        return block.text?.slice(0, 40) || "(ト書き未入力)";
      case "sceneHeading":
        return block.text || "(場面未入力)";
      case "setting":
        return block.text || "(設定未入力)";
      case "endMark":
        return block.text || "おわり";
      default:
        return "";
    }
  })();

  return (
    <div className="w-56 border-l border-gray-200 bg-white shrink-0 flex flex-col text-xs overflow-y-auto">
      {/* ブロック情報 */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-900">
            {blockLabel(block.type)}
          </span>
          <span className="text-gray-400">#{bi + 1}</span>
        </div>
        <p className="text-gray-500 truncate">{preview}</p>
      </div>

      {/* 種別変更 */}
      {canConvert && (
        <div className="p-3 border-b border-gray-100">
          <p className="text-gray-400 mb-1.5">ブロック種別</p>
          <div className="flex flex-wrap gap-1">
            {CONVERTIBLE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChangeBlockType(bi, t)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  block.type === t
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {blockLabel(t)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 移動・削除 */}
      <div className="p-3 border-b border-gray-100">
        <p className="text-gray-400 mb-1.5">操作</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveBlock(bi, "up")}
            disabled={!canMoveUp}
            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="上に移動（Ctrl+↑）"
          >
            <ChevronUp className="h-3 w-3" /> 上へ
          </button>
          <button
            type="button"
            onClick={() => onMoveBlock(bi, "down")}
            disabled={!canMoveDown}
            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="下に移動（Ctrl+↓）"
          >
            <ChevronDown className="h-3 w-3" /> 下へ
          </button>
          <div className="flex-1" />
          {canDelete && (
            <button
              type="button"
              onClick={() => onDeleteBlock(bi)}
              className="flex items-center gap-1 px-2 py-1 rounded text-red-500 hover:bg-red-50"
              title="ブロックを削除"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ブロック一覧 */}
      <div className="p-3 flex-1">
        <p className="text-gray-400 mb-1.5">ブロック一覧</p>
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {doc.blocks.map((b, i) => (
            <div
              key={i}
              className={`px-2 py-1 rounded text-[11px] truncate ${
                i === bi
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <span className="text-gray-400 mr-1">{i + 1}.</span>
              {blockLabel(b.type)}
              {b.type === "serif" && ` ${(b as any).speaker || ""}`}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
