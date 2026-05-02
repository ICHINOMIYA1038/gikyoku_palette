"use client";

import { useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { createEditorExtensions, EMPTY_DOCUMENT } from "@/lib/editor/editor-schema";
import { EditorToolbar } from "./editor-toolbar";
import { savePlayBody } from "@/actions/plays";
import "./editor.css";

type Props = {
  playId: string;
  initialContent: Record<string, unknown> | null;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function PlayEditor({ playId, initialContent }: Props) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback(
    (json: Record<string, unknown>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        try {
          const result = await savePlayBody(playId, json);
          setSaveStatus(result?.error ? "error" : "saved");
        } catch {
          setSaveStatus("error");
        }
      }, 800);
    },
    [playId]
  );

  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: initialContent ?? EMPTY_DOCUMENT,
    immediatelyRender: false,
    editorProps: {
      attributes: { spellcheck: "false" },
    },
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getJSON() as Record<string, unknown>);
    },
  });

  return (
    <div className="play-editor horizontal flex flex-col h-full">
      <div className="flex items-center justify-between">
        <EditorToolbar editor={editor} />
        <SaveIndicator status={saveStatus} />
      </div>
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto max-w-3xl">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const labels: Record<SaveStatus, string> = {
    idle: "",
    saving: "保存中...",
    saved: "保存済み",
    error: "保存エラー",
  };
  return (
    <span className={`px-3 py-1.5 text-xs ${status === "error" ? "text-red-500" : "text-gray-400"}`}>
      {labels[status]}
    </span>
  );
}
