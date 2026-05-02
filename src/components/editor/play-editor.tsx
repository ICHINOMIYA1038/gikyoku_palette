"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { createEditorExtensions, EMPTY_DOCUMENT } from "@/lib/editor/editor-schema";
import { EditorToolbar } from "./editor-toolbar";
import { VerticalPreview } from "./vertical-preview";
import { savePlayBody } from "@/actions/plays";
import "./editor.css";

type Props = {
  playId: string;
  initialContent: Record<string, unknown> | null;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";
export type ViewMode = "horizontal" | "vertical" | "preview";

export function PlayEditor({ playId, initialContent }: Props) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("horizontal");
  const [editorJson, setEditorJson] = useState<Record<string, unknown> | null>(
    initialContent ?? EMPTY_DOCUMENT
  );
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback(
    (json: Record<string, unknown>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        try {
          const result = await savePlayBody(playId, json);
          if (result?.error) {
            setSaveStatus("error");
          } else {
            setSaveStatus("saved");
          }
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
      attributes: {
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as Record<string, unknown>;
      setEditorJson(json);
      debouncedSave(json);
    },
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const editorClass =
    viewMode === "vertical" ? "play-editor vertical" : "play-editor horizontal";

  return (
    <div className={`${editorClass} flex flex-col h-full`}>
      <div className="flex items-center justify-between">
        <EditorToolbar
          editor={editor}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
        />
        <SaveIndicator status={saveStatus} />
      </div>
      <div ref={containerRef} className="flex flex-1 overflow-hidden">
        {viewMode === "preview" ? (
          <VerticalPreview doc={editorJson} height={containerHeight} />
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-auto bg-white">
            <div className={viewMode === "horizontal" ? "mx-auto max-w-3xl" : ""}>
              <EditorContent editor={editor} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const labels: Record<SaveStatus, string> = {
    idle: "",
    saving: "保存中...",
    saved: "保存済み",
    error: "保存エラー",
  };

  if (status === "idle") return null;

  return (
    <span
      className={`px-3 py-1.5 text-xs ${
        status === "error" ? "text-red-500" : "text-gray-400"
      }`}
    >
      {labels[status]}
    </span>
  );
}
