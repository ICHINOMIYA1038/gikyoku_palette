"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  type PlayDocument,
  type CursorPosition,
  type Block,
  EMPTY_DOC,
  fromBodyJson,
  toBodyJson,
} from "@/lib/editor/play-document";
import { BlockPanel } from "./block-panel";
import {
  type ColLayout,
  type SelectionRange,
  computeColumns,
  drawScript,
  hitTestScript,
  getMaxPage,
  PAGE_W,
  PAGE_H,
} from "@/lib/editor/draw-script";
import { drawHorizontal, hitTestHorizontal } from "@/lib/editor/draw-horizontal";
import { savePlayBody } from "@/actions/plays";

export type EditorMode = "horizontal" | "script";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  playId: string;
  initialContent: Record<string, unknown> | null;
};

export function CanvasEditor({ playId, initialContent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [doc, setDoc] = useState<PlayDocument>(() =>
    initialContent ? fromBodyJson(initialContent) : EMPTY_DOC
  );
  const [cursor, setCursor] = useState<CursorPosition>({
    blockIndex: 0, field: "title", charIndex: 0,
  });
  // 選択範囲: selAnchorがnullでなければ、anchor～cursorが選択範囲
  const [selAnchor, setSelAnchor] = useState<CursorPosition | null>(null);
  const [mode, setMode] = useState<EditorMode>("script");
  const [currentPage, setCurrentPage] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showPanel, setShowPanel] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const colsRef = useRef<ColLayout[]>([]);
  const historyRef = useRef<PlayDocument[]>([]);

  // 自動保存
  const scheduleSave = useCallback(
    (newDoc: PlayDocument) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        try {
          const result = await savePlayBody(playId, toBodyJson(newDoc));
          setSaveStatus(result?.error ? "error" : "saved");
        } catch { setSaveStatus("error"); }
      }, 800);
    },
    [playId]
  );

  const updateDoc = useCallback(
    (updater: (prev: PlayDocument) => PlayDocument) => {
      setDoc((prev) => {
        const next = updater(prev);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const pushHistory = useCallback(() => {
    historyRef.current.push(JSON.parse(JSON.stringify(doc)));
    if (historyRef.current.length > 50) historyRef.current.shift();
  }, [doc]);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev) {
      setDoc(prev);
      scheduleSave(prev);
      setCursor((c) => ({ ...c, blockIndex: Math.min(c.blockIndex, prev.blocks.length - 1) }));
    }
  }, [scheduleSave]);

  // ブロック移動
  const moveBlock = useCallback(
    (fromIndex: number, direction: "up" | "down") => {
      const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= doc.blocks.length) return;
      pushHistory();
      updateDoc((d) => {
        const nb = [...d.blocks];
        [nb[fromIndex], nb[toIndex]] = [nb[toIndex], nb[fromIndex]];
        return { ...d, blocks: nb };
      });
      setCursor((c) => ({ ...c, blockIndex: toIndex }));
    },
    [doc.blocks.length, pushHistory, updateDoc]
  );

  // ブロック削除
  const deleteBlock = useCallback(
    (index: number) => {
      if (doc.blocks.length <= 1) return;
      pushHistory();
      updateDoc((d) => ({ ...d, blocks: d.blocks.filter((_, i) => i !== index) }));
      setCursor((c) => ({
        ...c,
        blockIndex: Math.min(c.blockIndex, doc.blocks.length - 2),
      }));
    },
    [doc.blocks.length, pushHistory, updateDoc]
  );

  // ブロック種別変更
  const changeBlockType = useCallback(
    (index: number, newType: Block["type"]) => {
      const block = doc.blocks[index];
      if (!block || block.type === newType) return;
      pushHistory();
      updateDoc((d) => {
        const nb = [...d.blocks];
        const oldText = block.type === "serif" ? block.speech : (block as any).text || "";
        if (newType === "serif") {
          nb[index] = { type: "serif", speaker: "", speech: oldText };
        } else {
          nb[index] = { type: newType, text: oldText } as any;
        }
        return { ...d, blocks: nb };
      });
      setCursor({ blockIndex: index, field: newType === "serif" ? "speaker" : "text", charIndex: 0 });
    },
    [doc.blocks, pushHistory, updateDoc]
  );

  const insertBlock = useCallback(
    (block: Block) => {
      pushHistory();
      const insertAt = cursor.blockIndex + 1;
      updateDoc((d) => {
        const newBlocks = [...d.blocks];
        newBlocks.splice(insertAt, 0, block);
        return { ...d, blocks: newBlocks };
      });
      const field = block.type === "serif" ? "speaker" : block.type === "title" ? "title" : "text";
      setCursor({ blockIndex: insertAt, field, charIndex: 0 });
      inputRef.current?.focus();
    },
    [cursor.blockIndex, pushHistory, updateDoc]
  );

  // コンテナサイズ（横書きモード用 + スケーリング計算用）
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 0 && h > 0) setContainerSize({ w, h });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 台本モードのスケーリング
  const scriptScale = Math.min(
    (containerSize.w - 32) / PAGE_W,
    (containerSize.h - 16) / PAGE_H,
    1 // 1倍以上にはしない
  );

  // 描画
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 選択範囲を計算
    const sel: SelectionRange = selAnchor && selAnchor.blockIndex === cursor.blockIndex && selAnchor.field === cursor.field
      ? { blockIndex: cursor.blockIndex, field: cursor.field, start: Math.min(selAnchor.charIndex, cursor.charIndex), end: Math.max(selAnchor.charIndex, cursor.charIndex) }
      : null;

    if (mode === "script") {
      canvas.width = PAGE_W;
      canvas.height = PAGE_H;
      const cols = computeColumns(doc);
      colsRef.current = cols;
      drawScript(ctx, doc, cols, cursor, currentPage, sel);
    } else {
      canvas.width = containerSize.w;
      canvas.height = containerSize.h;
      colsRef.current = [];
      drawHorizontal(ctx, doc, cursor, containerSize.w, containerSize.h, sel);
    }
  }, [doc, cursor, selAnchor, containerSize, mode, currentPage]);

  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => { document.fonts.ready.then(() => redraw()); }, [redraw]);

  // (getSelectionText and copy handler are below getFieldText)

  // フィールドテキスト取得
  const getFieldText = useCallback(
    (pos: CursorPosition, d: PlayDocument = doc): string => {
      const block = d.blocks[pos.blockIndex];
      if (!block) return "";
      switch (block.type) {
        case "title":
          return pos.field === "title" ? block.title : pos.field === "author" ? block.author : "";
        case "serif":
          return pos.field === "speaker" ? block.speaker : pos.field === "direction" ? (block.direction || "") : block.speech;
        case "castList":
          return "";
        default:
          return (block as any).text || "";
      }
    },
    [doc]
  );

  // コピー対象テキストを取得
  const getSelectionText = useCallback(() => {
    const text = getFieldText(cursor);
    if (selAnchor && selAnchor.blockIndex === cursor.blockIndex && selAnchor.field === cursor.field) {
      const start = Math.min(selAnchor.charIndex, cursor.charIndex);
      const end = Math.max(selAnchor.charIndex, cursor.charIndex);
      return text.slice(start, end);
    }
    return text;
  }, [cursor, selAnchor, getFieldText]);

  // document-levelのコピーイベントをinterceptしてテキストを強制コピー
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const text = getSelectionText();
      if (text) {
        e.preventDefault();
        e.clipboardData?.setData("text/plain", text);
      }
    };
    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, [getSelectionText]);

  // マウス座標 → カーソル位置
  const hitTest = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): CursorPosition | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const cw = mode === "script" ? PAGE_W : containerSize.w;
      const ch = mode === "script" ? PAGE_H : containerSize.h;
      const mx = (e.clientX - rect.left) * (cw / rect.width);
      const my = (e.clientY - rect.top) * (ch / rect.height);
      return mode === "script"
        ? hitTestScript(doc, colsRef.current, mx, my, currentPage)
        : hitTestHorizontal(doc, mx, my);
    },
    [doc, containerSize, mode, currentPage]
  );

  const isDraggingRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // mousedown: カーソル設置 + ドラッグ開始
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = hitTest(e);
      if (!pos) return;
      if (e.shiftKey && cursor.blockIndex === pos.blockIndex && cursor.field === pos.field) {
        if (!selAnchor) setSelAnchor({ ...cursor });
        setCursor(pos);
      } else {
        setSelAnchor({ ...pos }); // ドラッグ開始地点
        setCursor(pos);
      }
      isDraggingRef.current = true;
      inputRef.current?.focus();
    },
    [hitTest, cursor, selAnchor]
  );

  // mousemove: ドラッグ中に選択範囲を拡張
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return;
      const pos = hitTest(e);
      if (pos && selAnchor && pos.blockIndex === selAnchor.blockIndex && pos.field === selAnchor.field) {
        setCursor(pos);
      }
    },
    [hitTest, selAnchor]
  );

  // 右クリック: コンテキストメニュー
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const ctxMenuCopy = useCallback(() => {
    document.execCommand("copy");
    setContextMenu(null);
  }, []);

  const ctxMenuPaste = useCallback(() => {
    navigator.clipboard?.readText().then((text) => {
      if (!text) return;
      pushHistory();
      const { blockIndex, field, charIndex } = cursor;
      const fieldText = getFieldText(cursor);
      const newText = fieldText.slice(0, charIndex) + text + fieldText.slice(charIndex);
      updateDoc((d) => {
        const nb = [...d.blocks];
        const b = { ...nb[blockIndex] } as any;
        if (b.type === "title") { if (field === "title") b.title = newText; else b.author = newText; }
        else if (b.type === "serif") { if (field === "speaker") b.speaker = newText; else b.speech = newText; }
        else b.text = newText;
        nb[blockIndex] = b;
        return { ...d, blocks: nb };
      });
      setCursor({ ...cursor, charIndex: charIndex + text.length });
      setSelAnchor(null);
    });
    setContextMenu(null);
  }, [cursor, getFieldText, pushHistory, updateDoc]);

  const ctxMenuSelectAll = useCallback(() => {
    const text = getFieldText(cursor);
    setSelAnchor({ ...cursor, charIndex: 0 });
    setCursor({ ...cursor, charIndex: text.length });
    setContextMenu(null);
  }, [cursor, getFieldText]);

  // クリックでメニュー閉じる
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu]);

  // mouseup: ドラッグ終了、選択が0幅なら解除
  const handleMouseUp = useCallback(
    () => {
      isDraggingRef.current = false;
      if (selAnchor && selAnchor.blockIndex === cursor.blockIndex &&
          selAnchor.field === cursor.field &&
          selAnchor.charIndex === cursor.charIndex) {
        setSelAnchor(null); // 選択なし（同じ位置でクリック）
      }
    },
    [selAnchor, cursor]
  );

  // キーボード
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z") { e.preventDefault(); undo(); return; }

      // コピー: document.execCommandでコピーイベントを発火 → handleCopyでintercept
      if (mod && e.key === "c") {
        e.preventDefault();
        document.execCommand("copy");
        return;
      }

      // 全選択: フィールド全体を選択
      if (mod && e.key === "a") {
        e.preventDefault();
        const text = getFieldText(cursor);
        setSelAnchor({ ...cursor, charIndex: 0 });
        setCursor({ ...cursor, charIndex: text.length });
        return;
      }

      // ブロック移動 (Ctrl+Shift+↑/↓)
      if (mod && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        moveBlock(cursor.blockIndex, e.key === "ArrowUp" ? "up" : "down");
        return;
      }

      const { blockIndex, field, charIndex } = cursor;
      const block = doc.blocks[blockIndex];
      if (!block) return;

      if (e.key === "Enter") {
        e.preventDefault();
        pushHistory();
        if (block.type === "title" && field === "title") {
          setCursor({ blockIndex, field: "author", charIndex: 0 });
        } else if (block.type === "serif" && field === "speaker") {
          setCursor({ blockIndex, field: "speech", charIndex: 0 });
        } else {
          updateDoc((d) => {
            const nb = [...d.blocks];
            nb.splice(blockIndex + 1, 0, { type: "serif", speaker: "", speech: "" });
            return { ...d, blocks: nb };
          });
          setCursor({ blockIndex: blockIndex + 1, field: "speaker", charIndex: 0 });
        }
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        // 選択範囲がある場合はまず削除
        const delResult = deleteSelection();
        if (delResult !== null) {
          pushHistory();
          updateDoc((d) => {
            const nb = [...d.blocks];
            const b = { ...nb[cursor.blockIndex] } as any;
            if (b.type === "title") { if (cursor.field === "title") b.title = delResult; else b.author = delResult; }
            else if (b.type === "serif") { if (cursor.field === "speaker") b.speaker = delResult; else b.speech = delResult; }
            else b.text = delResult;
            nb[cursor.blockIndex] = b;
            return { ...d, blocks: nb };
          });
          return;
        }
        pushHistory();
        const text = getFieldText(cursor);
        if (charIndex > 0) {
          const newText = text.slice(0, charIndex - 1) + text.slice(charIndex);
          updateDoc((d) => {
            const nb = [...d.blocks];
            const b = { ...nb[blockIndex] } as any;
            if (b.type === "title") { if (field === "title") b.title = newText; else b.author = newText; }
            else if (b.type === "serif") { if (field === "speaker") b.speaker = newText; else b.speech = newText; }
            else b.text = newText;
            nb[blockIndex] = b;
            return { ...d, blocks: nb };
          });
          setCursor({ ...cursor, charIndex: charIndex - 1 });
        } else if (block.type === "serif" && field === "speech" && text === "") {
          setCursor({ blockIndex, field: "speaker", charIndex: getFieldText({ blockIndex, field: "speaker", charIndex: 0 }).length });
        } else if (block.type === "serif" && field === "speaker" && text === "" && block.speech === "" && doc.blocks.length > 1) {
          updateDoc((d) => ({ ...d, blocks: d.blocks.filter((_, i) => i !== blockIndex) }));
          const pi = Math.max(0, blockIndex - 1);
          const pb = doc.blocks[pi];
          const pf = pb?.type === "serif" ? "speech" : pb?.type === "title" ? "title" : "text";
          setCursor({ blockIndex: pi, field: pf, charIndex: getFieldText({ blockIndex: pi, field: pf, charIndex: 0 }).length });
        }
        return;
      }

      // 矢印キー（Shift押下で選択範囲拡張）
      const isVertical = mode === "script";
      const handleArrowMove = (newCursor: CursorPosition) => {
        if (e.shiftKey) {
          if (!selAnchor) setSelAnchor({ ...cursor });
        } else {
          setSelAnchor(null);
        }
        setCursor(newCursor);
      };

      if (e.key === "ArrowDown" || (!isVertical && e.key === "ArrowRight")) {
        e.preventDefault();
        const text = getFieldText(cursor);
        if (charIndex < text.length) handleArrowMove({ ...cursor, charIndex: charIndex + 1 });
        return;
      }
      if (e.key === "ArrowUp" || (!isVertical && e.key === "ArrowLeft")) {
        e.preventDefault();
        if (charIndex > 0) handleArrowMove({ ...cursor, charIndex: charIndex - 1 });
        return;
      }
      if ((isVertical && e.key === "ArrowLeft") || (!isVertical && e.key === "ArrowDown")) {
        e.preventDefault();
        if (blockIndex < doc.blocks.length - 1) {
          const nb = doc.blocks[blockIndex + 1];
          const nf = nb.type === "serif" ? "speaker" : nb.type === "title" ? "title" : "text";
          setCursor({ blockIndex: blockIndex + 1, field: nf, charIndex: 0 });
        }
        return;
      }
      if ((isVertical && e.key === "ArrowRight") || (!isVertical && e.key === "ArrowUp")) {
        e.preventDefault();
        if (blockIndex > 0) {
          const pb = doc.blocks[blockIndex - 1];
          const pf = pb.type === "serif" ? "speaker" : pb.type === "title" ? "title" : "text";
          setCursor({ blockIndex: blockIndex - 1, field: pf, charIndex: 0 });
        }
        return;
      }
    },
    [cursor, doc, getFieldText, updateDoc, pushHistory, undo, mode, moveBlock]
  );

  // 選択範囲を削除して新しいテキストに置き換え
  const deleteSelection = useCallback((): string | null => {
    if (!selAnchor || selAnchor.blockIndex !== cursor.blockIndex || selAnchor.field !== cursor.field) return null;
    const text = getFieldText(cursor);
    const start = Math.min(selAnchor.charIndex, cursor.charIndex);
    const end = Math.max(selAnchor.charIndex, cursor.charIndex);
    if (start === end) return null;
    const newText = text.slice(0, start) + text.slice(end);
    setSelAnchor(null);
    setCursor({ ...cursor, charIndex: start });
    return newText;
  }, [selAnchor, cursor, getFieldText]);

  // テキスト入力（通常入力 + ペースト共通）
  const applyTextChange = useCallback(
    (newFullText: string) => {
      const { blockIndex, field } = cursor;
      const oldText = getFieldText(cursor);
      if (newFullText === oldText) return;
      pushHistory();
      setSelAnchor(null);
      // カーソル位置はテキスト長の差分で計算
      const newCharIndex = cursor.charIndex + (newFullText.length - oldText.length);
      updateDoc((d) => {
        const nb = [...d.blocks];
        const b = { ...nb[blockIndex] } as any;
        if (b.type === "title") { if (field === "title") b.title = newFullText; else b.author = newFullText; }
        else if (b.type === "serif") { if (field === "speaker") b.speaker = newFullText; else b.speech = newFullText; }
        else b.text = newFullText;
        nb[blockIndex] = b;
        return { ...d, blocks: nb };
      });
      setCursor({ ...cursor, charIndex: Math.max(0, newCharIndex) });
    },
    [cursor, getFieldText, pushHistory, updateDoc]
  );

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      applyTextChange(e.currentTarget.value);
    },
    [applyTextChange]
  );

  // ペースト
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text/plain");
      if (!pastedText) return;
      const { charIndex } = cursor;
      const text = getFieldText(cursor);
      const newText = text.slice(0, charIndex) + pastedText + text.slice(charIndex);
      applyTextChange(newText);
    },
    [cursor, getFieldText, applyTextChange]
  );

  // ページ操作
  const maxPage = mode === "script" ? getMaxPage(colsRef.current) : 0;
  const statusLabel = saveStatus === "idle" ? "" : saveStatus === "saving" ? "保存中..." : saveStatus === "error" ? "保存エラー" : "保存済み";

  return (
    <div className="flex flex-col h-full">
      {/* ツールバー */}
      <div className="flex items-center gap-1 bg-white border-b border-gray-200 px-3 py-1 shrink-0">
        <div className="flex items-center bg-gray-100 rounded-md p-0.5 mr-2">
          <ModeBtn label="横書き" active={mode === "horizontal"} onClick={() => setMode("horizontal")} />
          <ModeBtn label="台本" active={mode === "script"} onClick={() => setMode("script")} />
        </div>

        <div className="mx-1 h-4 w-px bg-gray-200" />

        <ToolBtn label="セリフ" shortcut="Enter" onClick={() => insertBlock({ type: "serif", speaker: "", speech: "" })} />
        <ToolBtn label="ト書き" onClick={() => insertBlock({ type: "togaki", text: "" })} />
        <ToolBtn label="場面" onClick={() => insertBlock({ type: "sceneHeading", text: "" })} />
        <ToolBtn label="舞台設定" onClick={() => insertBlock({ type: "setting", text: "" })} />
        <ToolBtn label="終幕" onClick={() => insertBlock({ type: "endMark", text: "おわり" })} />

        <div className="mx-1 h-4 w-px bg-gray-200" />
        <ToolBtn label="元に戻す" shortcut="⌘Z" onClick={undo} />

        <div className="mx-1 h-4 w-px bg-gray-200" />
        <ToolBtn label={showPanel ? "パネル非表示" : "パネル"} onClick={() => setShowPanel((v) => !v)} />

        <div className="flex-1" />

        {/* ページ送り（台本モード） */}
        {mode === "script" && maxPage > 0 && (
          <div className="flex items-center gap-1 mr-3">
            <button type="button" onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-1.5 py-0.5 text-xs rounded disabled:text-gray-300 text-gray-600 hover:bg-gray-100">
              ◀
            </button>
            <span className="text-xs text-gray-500">{currentPage + 1}/{maxPage + 1}</span>
            <button type="button" onClick={() => setCurrentPage((p) => Math.min(maxPage, p + 1))}
              disabled={currentPage === maxPage}
              className="px-1.5 py-0.5 text-xs rounded disabled:text-gray-300 text-gray-600 hover:bg-gray-100">
              ▶
            </button>
          </div>
        )}

        <span className="text-xs text-gray-400">{doc.blocks.length}ブロック</span>
        {statusLabel && (
          <span className={`text-xs ml-3 ${saveStatus === "error" ? "text-red-500" : "text-gray-400"}`}>{statusLabel}</span>
        )}
      </div>

      {/* Canvas + Side Panel */}
      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="relative flex-1 bg-gray-100 overflow-hidden flex items-start justify-center">
          {mode === "script" ? (
            <div className="origin-top mt-2 shadow-lg" style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scriptScale})` }}>
              <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onContextMenu={handleContextMenu} className="cursor-text" style={{ width: PAGE_W, height: PAGE_H }} />
              <textarea ref={inputRef} onKeyDown={handleKeyDown} onInput={handleInput} onPaste={handlePaste} className="absolute opacity-0" style={{ top: -9999, left: -9999, width: 1, height: 1 }} autoFocus />
            </div>
          ) : (
            <>
              <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onContextMenu={handleContextMenu} className="absolute inset-0 cursor-text" style={{ width: "100%", height: "100%" }} />
              <textarea ref={inputRef} onKeyDown={handleKeyDown} onInput={handleInput} onPaste={handlePaste} className="absolute opacity-0" style={{ top: -9999, left: -9999, width: 1, height: 1 }} autoFocus />
            </>
          )}
        </div>
        {/* コンテキストメニュー */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button type="button" onClick={ctxMenuCopy}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
              コピー
            </button>
            <button type="button" onClick={ctxMenuPaste}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
              ペースト
            </button>
            <div className="border-t border-gray-100 my-0.5" />
            <button type="button" onClick={ctxMenuSelectAll}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
              すべて選択
            </button>
          </div>
        )}

        {showPanel && (
          <BlockPanel
            doc={doc}
            cursor={cursor}
            onMoveBlock={moveBlock}
            onDeleteBlock={deleteBlock}
            onChangeBlockType={changeBlockType}
          />
        )}
      </div>
    </div>
  );
}

function ModeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded transition-colors ${active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
      {label}
    </button>
  );
}

function ToolBtn({ label, shortcut, onClick }: { label: string; shortcut?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={shortcut ? `${label} (${shortcut})` : label}
      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
      {label}
      {shortcut && <kbd className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded px-1">{shortcut}</kbd>}
    </button>
  );
}
