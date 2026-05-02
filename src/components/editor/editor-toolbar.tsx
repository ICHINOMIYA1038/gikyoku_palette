"use client";

import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { Bold, Italic, MessageSquareText, Minus, Heading3 } from "lucide-react";
import type { ViewMode } from "./play-editor";

type Props = {
  editor: Editor | null;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
};

/**
 * カーソル位置を含むドキュメント直下ブロックの末尾位置を返す。
 * ネストされたノード（serif > speaker 等）内にいても正しく動く。
 */
function findTopBlockEnd(editor: Editor): number {
  const { $from } = editor.state.selection;
  // depth 1 = ドキュメント直下のブロック
  const topBlockDepth = Math.min($from.depth, 1);
  const topBlockEnd = $from.end(topBlockDepth);
  return topBlockEnd;
}

export function EditorToolbar({ editor, viewMode, onChangeViewMode }: Props) {
  if (!editor) return null;

  const insertSerif = () => {
    const { state } = editor;
    const insertPos = findTopBlockEnd(editor) + 1;
    const newSerif = state.schema.nodes.serif.create(null, [
      state.schema.nodes.speaker.create(),
      state.schema.nodes.speechContent.create(),
    ]);
    const tr = state.tr.insert(insertPos, newSerif);
    // 新しいserifのspeaker内にカーソル
    tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
    editor.view.dispatch(tr);
    editor.view.focus();
  };

  const insertTogaki = () => {
    const { state } = editor;
    const insertPos = findTopBlockEnd(editor) + 1;
    const node = state.schema.nodes.togaki.create();
    const tr = state.tr.insert(insertPos, node);
    tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
    editor.view.dispatch(tr);
    editor.view.focus();
  };

  const insertSceneHeading = () => {
    const { state } = editor;
    const insertPos = findTopBlockEnd(editor) + 1;
    const node = state.schema.nodes.sceneHeading.create();
    const tr = state.tr.insert(insertPos, node);
    tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
    editor.view.dispatch(tr);
    editor.view.focus();
  };

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 bg-white px-3 py-1.5 sticky top-0 z-10">
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        label="太字"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        label="斜体"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />

      <div className="mx-2 h-5 w-px bg-gray-200" />

      <ToolbarButton
        icon={<MessageSquareText className="h-4 w-4" />}
        label="セリフ"
        onClick={insertSerif}
      />
      <ToolbarButton
        icon={<Minus className="h-4 w-4" />}
        label="ト書き"
        onClick={insertTogaki}
      />
      <ToolbarButton
        icon={<Heading3 className="h-4 w-4" />}
        label="場面"
        onClick={insertSceneHeading}
      />

      <div className="mx-2 h-5 w-px bg-gray-200" />

      <ToolbarButton
        icon={<span className="text-[10px] font-bold leading-none">横</span>}
        label="横書き"
        active={viewMode === "horizontal"}
        onClick={() => onChangeViewMode("horizontal")}
      />
      <ToolbarButton
        icon={<span className="text-[10px] font-bold leading-none">縦</span>}
        label="縦書き"
        active={viewMode === "vertical"}
        onClick={() => onChangeViewMode("vertical")}
      />
      <ToolbarButton
        icon={<span className="text-[10px] font-bold leading-none">版</span>}
        label="印刷プレビュー"
        active={viewMode === "preview"}
        onClick={() => onChangeViewMode("preview")}
      />
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
