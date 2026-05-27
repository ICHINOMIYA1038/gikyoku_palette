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
  type ScriptDragState,
  type CursorRect,
  computeColumns,
  drawScript,
  hitTestScript,
  getMaxPage,
  findScriptDropIndex,
  hitTestScriptAnyBlock,
  PAGE_W,
  PAGE_H,
  COL_W,
  M_TOP,
  HEADER_H,
  SEP_Y,
} from "@/lib/editor/draw-script";
import { drawHorizontal, hitTestHorizontal, findDropIndex, H_DRAG_HANDLE_W, type BlockDragState } from "@/lib/editor/draw-horizontal";
import { savePlayBody } from "@/actions/plays";
import { exportPdf } from "@/lib/editor/export-pdf";
import { CURSOR_PEN, CURSOR_GRAB, CURSOR_GRABBING } from "./cursors";

export type EditorMode = "horizontal" | "script";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  playId: string;
  initialContent: Record<string, unknown> | null;
};

export function CanvasEditor({ playId, initialContent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null); // 横書きモード用
  const scriptCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const [doc, setDoc] = useState<PlayDocument>(() =>
    initialContent ? fromBodyJson(initialContent) : EMPTY_DOC
  );
  const [cursor, setCursor] = useState<CursorPosition>({
    blockIndex: 0, field: "title", charIndex: 0,
  });
  // 選択範囲: selAnchorがnullでなければ、anchor～cursorが選択範囲
  const [selAnchor, setSelAnchor] = useState<CursorPosition | null>(null);
  const [mode, setMode] = useState<EditorMode>("script");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showPanel, setShowPanel] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const colsRef = useRef<ColLayout[]>([]);
  const historyRef = useRef<PlayDocument[]>([]);
  const cursorOutRef = useRef<{ rect: CursorRect | null }>({ rect: null });
  const [inputPos, setInputPos] = useState<{ left: number; top: number; height: number } | null>(null);

  // 自動保存
  const scheduleSave = useCallback(
    (newDoc: PlayDocument) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        try {
          const result = await savePlayBody(playId, toBodyJson(newDoc));
          setSaveStatus(result.success ? "saved" : "error");
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

  // ブロック並替（ドラッグ&ドロップ）
  const reorderBlock = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      pushHistory();
      updateDoc((d) => {
        const nb = [...d.blocks];
        const [moved] = nb.splice(fromIndex, 1);
        nb.splice(toIndex, 0, moved);
        return { ...d, blocks: nb };
      });
      setCursor((c) => {
        if (c.blockIndex === fromIndex) return { ...c, blockIndex: toIndex };
        return c;
      });
    },
    [pushHistory, updateDoc]
  );

  // ブロック選択（パネルからクリック）
  const selectBlock = useCallback(
    (index: number) => {
      const block = doc.blocks[index];
      if (!block) return;
      const field = block.type === "serif" ? "speaker" : block.type === "title" ? "title" : "text";
      setCursor({ blockIndex: index, field, charIndex: 0 });
      setSelAnchor(null);
      inputRef.current?.focus();
    },
    [doc.blocks]
  );

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

  // ブロック更新（任意フィールド書き換え用、castList characters編集等）
  const updateBlockAt = useCallback(
    (index: number, updater: (b: Block) => Block) => {
      pushHistory();
      updateDoc((d) => {
        const nb = [...d.blocks];
        if (nb[index]) nb[index] = updater(nb[index]);
        return { ...d, blocks: nb };
      });
    },
    [pushHistory, updateDoc]
  );

  // ブロック削除（最後の1ブロックになる場合は空のセリフブロックを残す）
  const deleteBlock = useCallback(
    (index: number) => {
      pushHistory();
      updateDoc((d) => {
        const filtered = d.blocks.filter((_, i) => i !== index);
        const blocks = filtered.length === 0
          ? [{ type: "serif", speaker: "", speech: "" } as Block]
          : filtered;
        return { ...d, blocks };
      });
      setCursor((c) => ({
        blockIndex: Math.max(0, Math.min(c.blockIndex, doc.blocks.length - 2)),
        field: "speaker",
        charIndex: 0,
      }));
      setSelAnchor(null);
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

  // Enter後に表示するブロック種別選択ポップアップ
  const [blockPicker, setBlockPicker] = useState<{ blockIndex: number } | null>(null);

  // 登場人物名リスト（castListブロックから抽出）
  const castNames = (() => {
    for (const b of doc.blocks) {
      if (b.type === "castList") return b.characters.map((c) => c.name).filter((n) => n.length > 0);
    }
    return [];
  })();

  // IME composing text（Canvasに表示するため）
  const [composingText, setComposingText] = useState("");
  const isComposingRef = useRef(false);
  // 話者ピッカーで数字選択した直後のcompositionEndをスキップ
  const skipCompositionEndRef = useRef(false);
  const cursorRef = useRef(cursor);
  const docRef = useRef(doc);
  useEffect(() => { cursorRef.current = cursor; }, [cursor]);
  useEffect(() => { docRef.current = doc; }, [doc]);

  // ブロックドラッグ状態
  const [blockDrag, setBlockDrag] = useState<BlockDragState>(null);
  const [scriptDrag, setScriptDrag] = useState<ScriptDragState>(null);
  const blockDragRef = useRef<{ index: number; mode: "h" | "v" } | null>(null);

  // 描画
  const redraw = useCallback(() => {
    // 選択範囲を計算
    const sel: SelectionRange = selAnchor && selAnchor.blockIndex === cursor.blockIndex && selAnchor.field === cursor.field
      ? { blockIndex: cursor.blockIndex, field: cursor.field, start: Math.min(selAnchor.charIndex, cursor.charIndex), end: Math.max(selAnchor.charIndex, cursor.charIndex) }
      : null;

    if (mode === "script") {
      // 全ページ描画。カーソルが含まれるページのみcursorOutに位置を書き込む
      const cols = computeColumns(doc);
      colsRef.current = cols;
      // カーソルが居るページを特定
      let cursorPage = 0;
      for (const c of cols) {
        if (c.blockIndex === cursor.blockIndex && (c.field === cursor.field || c.special)) {
          if (cursor.charIndex >= c.startCharIndex && cursor.charIndex <= c.startCharIndex + c.chars.length) {
            cursorPage = c.page;
            break;
          }
        }
      }
      let cursorScreenRect: { x: number; y: number; h: number; canvas: HTMLCanvasElement } | null = null;
      scriptCanvasRefs.current.forEach((canvas, page) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = PAGE_W;
        canvas.height = PAGE_H;
        const out = { rect: null as any };
        drawScript(ctx, doc, cols, cursor, page, sel, scriptDrag, composingText, out);
        if (page === cursorPage && out.rect) {
          cursorScreenRect = { x: out.rect.x, y: out.rect.y, h: out.rect.h, canvas };
        }
      });
      if (cursorScreenRect) {
        const { x, y, h, canvas } = cursorScreenRect as any;
        const rect = canvas.getBoundingClientRect();
        const sx = rect.width / canvas.width;
        const sy = rect.height / canvas.height;
        setInputPos({ left: rect.left + x * sx, top: rect.top + y * sy, height: Math.max(20, h * sy) });
      } else {
        setInputPos(null);
      }
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const out = cursorOutRef.current;
      canvas.width = containerSize.w;
      canvas.height = containerSize.h;
      colsRef.current = [];
      drawHorizontal(ctx, doc, cursor, containerSize.w, containerSize.h, sel, blockDrag, composingText, out);
      const rect = canvas.getBoundingClientRect();
      const cr: CursorRect | null = out.rect;
      if (cr) {
        const sx = rect.width / canvas.width;
        const sy = rect.height / canvas.height;
        setInputPos({ left: rect.left + cr.x * sx, top: rect.top + cr.y * sy, height: Math.max(20, cr.h * sy) });
      } else {
        setInputPos(null);
      }
    }
  }, [doc, cursor, selAnchor, containerSize, mode, blockDrag, scriptDrag, composingText]);

  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => { document.fonts.ready.then(() => redraw()); }, [redraw]);

  // (composingText moved above redraw)


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

  // テキストを現在のカーソル位置に挿入（refベース、stale closure回避）
  const insertTextAtCursor = useCallback((text: string) => {
    if (!text) return;
    // 文字入力したらピッカーを閉じる
    setBlockPicker(null);
    const cur = cursorRef.current;
    const d = docRef.current;
    const block = d.blocks[cur.blockIndex];
    if (!block) return;
    // castListはcastIndexで指定された人物名にテキストを挿入
    if (block.type === "castList") {
      const idx = cur.castIndex ?? 0;
      pushHistory();
      setSelAnchor(null);
      updateDoc((dd) => {
        const nb = [...dd.blocks];
        const b = { ...nb[cur.blockIndex] } as any;
        const characters = [...(b.characters || [])];
        while (characters.length <= idx) characters.push({ name: "", description: "" });
        const cur_name = characters[idx].name || "";
        const new_name = cur_name.slice(0, cur.charIndex) + text + cur_name.slice(cur.charIndex);
        characters[idx] = { ...characters[idx], name: new_name };
        b.characters = characters;
        nb[cur.blockIndex] = b;
        return { ...dd, blocks: nb };
      });
      setCursor({ ...cur, charIndex: cur.charIndex + text.length });
      return;
    }
    const fieldText = (() => {
      switch (block.type) {
        case "title": return cur.field === "title" ? block.title : cur.field === "author" ? block.author : "";
        case "serif": return cur.field === "speaker" ? block.speaker : cur.field === "direction" ? (block.direction || "") : block.speech;
        default: return (block as any).text || "";
      }
    })();
    const newText = fieldText.slice(0, cur.charIndex) + text + fieldText.slice(cur.charIndex);
    pushHistory();
    setSelAnchor(null);
    updateDoc((dd) => {
      const nb = [...dd.blocks];
      const b = { ...nb[cur.blockIndex] } as any;
      if (b.type === "title") { if (cur.field === "title") b.title = newText; else b.author = newText; }
      else if (b.type === "serif") { if (cur.field === "speaker") b.speaker = newText; else b.speech = newText; }
      else b.text = newText;
      nb[cur.blockIndex] = b;
      return { ...dd, blocks: nb };
    });
    setCursor({ ...cur, charIndex: cur.charIndex + text.length });
  }, [pushHistory, updateDoc]);

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

  // マウス座標 → カーソル位置（クリックされたcanvasから直接読み取る）
  const pageOf = (e: React.MouseEvent<HTMLCanvasElement>): number => {
    const p = (e.currentTarget as HTMLCanvasElement).dataset.page;
    return p ? Number(p) : 0;
  };
  const hitTest = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): CursorPosition | null => {
      const canvas = e.currentTarget as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const cw = mode === "script" ? PAGE_W : containerSize.w;
      const ch = mode === "script" ? PAGE_H : containerSize.h;
      const mx = (e.clientX - rect.left) * (cw / rect.width);
      const my = (e.clientY - rect.top) * (ch / rect.height);
      return mode === "script"
        ? hitTestScript(doc, colsRef.current, mx, my, pageOf(e))
        : hitTestHorizontal(doc, mx, my);
    },
    [doc, containerSize, mode]
  );

  const isDraggingRef = useRef(false);
  const dragAnchorRef = useRef<CursorPosition | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // mousedown: カーソル設置 + テキストドラッグ or ブロックドラッグ
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 2) return;
      e.preventDefault(); // Canvasへのフォーカスをブロック
      setContextMenu(null);
      setBlockPicker(null);
      inputRef.current?.focus();

      const canvas = e.currentTarget as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();

      if (mode === "horizontal") {
        const mx = (e.clientX - rect.left) * (containerSize.w / rect.width);
        if (mx < H_DRAG_HANDLE_W) {
          const my = (e.clientY - rect.top) * (containerSize.h / rect.height);
          const pos = hitTestHorizontal(doc, mx + 40, my);
          if (pos) {
            blockDragRef.current = { index: pos.blockIndex, mode: "h" };
            setBlockDrag({ draggingIndex: pos.blockIndex, mouseY: my });
            return;
          }
        }
      } else {
        const mx = (e.clientX - rect.left) * (PAGE_W / rect.width);
        const my = (e.clientY - rect.top) * (PAGE_H / rect.height);
        if (my < M_TOP + HEADER_H + 12) {
          const pos = hitTestScript(doc, colsRef.current, mx, my, pageOf(e));
          if (pos) {
            blockDragRef.current = { index: pos.blockIndex, mode: "v" };
            setScriptDrag({ draggingIndex: pos.blockIndex, mouseX: mx });
            return;
          }
        }
      }

      const pos = hitTest(e);
      if (!pos) return;
      if (e.shiftKey && cursor.blockIndex === pos.blockIndex && cursor.field === pos.field) {
        // Shift+クリック: 選択範囲を拡張
        if (!selAnchor) setSelAnchor({ ...cursor });
        setCursor(pos);
      } else {
        // 通常クリック: 選択解除、ドラッグ用のアンカーは別途管理
        setSelAnchor(null);
        setCursor(pos);
        dragAnchorRef.current = { ...pos }; // ドラッグ開始地点（selAnchorとは別）
      }
      isDraggingRef.current = true;
      inputRef.current?.focus();
    },
    [hitTest, cursor, selAnchor, mode, containerSize, doc]
  );

  // カーソルスタイル
  const [canvasCursor, setCanvasCursor] = useState(CURSOR_PEN);

  // mousemove: テキスト選択 or ブロックドラッグ + カーソル切替
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget as HTMLCanvasElement;
      // ブロックドラッグ中
      if (blockDragRef.current) {
        setCanvasCursor(CURSOR_GRABBING);
        const rect = canvas.getBoundingClientRect();
        if (blockDragRef.current.mode === "h") {
          const my = (e.clientY - rect.top) * (containerSize.h / rect.height);
          setBlockDrag({ draggingIndex: blockDragRef.current.index, mouseY: my });
        } else {
          const mx = (e.clientX - rect.left) * (PAGE_W / rect.width);
          setScriptDrag({ draggingIndex: blockDragRef.current.index, mouseX: mx });
        }
        return;
      }
      // テキスト選択（ドラッグで範囲拡張）
      if (!isDraggingRef.current) {
        const rect = canvas.getBoundingClientRect();
        if (mode === "horizontal") {
          const mx = (e.clientX - rect.left) * (containerSize.w / rect.width);
          setCanvasCursor(mx < H_DRAG_HANDLE_W ? CURSOR_GRAB : CURSOR_PEN);
        } else {
          const my = (e.clientY - rect.top) * (PAGE_H / rect.height);
          setCanvasCursor(my < M_TOP + HEADER_H + 12 ? CURSOR_GRAB : CURSOR_PEN);
        }
        return;
      }
      const pos = hitTest(e);
      if (pos && dragAnchorRef.current &&
          pos.blockIndex === dragAnchorRef.current.blockIndex &&
          pos.field === dragAnchorRef.current.field &&
          pos.charIndex !== dragAnchorRef.current.charIndex) {
        // ドラッグで位置が変わったら選択開始
        setSelAnchor(dragAnchorRef.current);
        setCursor(pos);
      } else if (pos && selAnchor && pos.blockIndex === selAnchor.blockIndex && pos.field === selAnchor.field) {
        setCursor(pos);
      }
    },
    [hitTest, selAnchor, containerSize]
  );

  // 右クリック: コンテキストメニュー
  // 選択範囲がある場合: カーソル位置を変更しない（選択を保持）
  // 選択範囲がない場合: 右クリック位置のブロックにカーソル移動（castList等の編集不可ブロックも含む）
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const hasSelection = selAnchor && (selAnchor.blockIndex !== cursor.blockIndex || selAnchor.field !== cursor.field || selAnchor.charIndex !== cursor.charIndex);
      if (!hasSelection) {
        const pos = hitTest(e);
        if (pos) {
          setCursor(pos);
          setSelAnchor(null);
        } else if (mode === "script") {
          const canvas = e.currentTarget as HTMLCanvasElement;
          const rect = canvas.getBoundingClientRect();
          const mx = (e.clientX - rect.left) * (PAGE_W / rect.width);
          const bi = hitTestScriptAnyBlock(colsRef.current, mx, pageOf(e));
          if (bi !== null) {
            setCursor({ blockIndex: bi, field: "text", charIndex: 0 });
            setSelAnchor(null);
          }
        }
      }
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [hitTest, selAnchor, cursor, mode]
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

  // mouseup: テキスト選択確定 or ブロックドロップ
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // ブロックドロップ
      if (blockDragRef.current) {
        const canvas = e.currentTarget as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        const fromIdx = blockDragRef.current.index;

        if (blockDragRef.current.mode === "h" && blockDrag) {
          const my = (e.clientY - rect.top) * (containerSize.h / rect.height);
          const dropIdx = findDropIndex(doc, my);
          if (fromIdx !== dropIdx && fromIdx !== dropIdx - 1) {
            reorderBlock(fromIdx, dropIdx > fromIdx ? dropIdx - 1 : dropIdx);
          }
        } else if (blockDragRef.current.mode === "v" && scriptDrag) {
          const mx = (e.clientX - rect.left) * (PAGE_W / rect.width);
          const dropIdx = findScriptDropIndex(colsRef.current, mx, pageOf(e));
          if (fromIdx !== dropIdx && fromIdx !== dropIdx - 1) {
            reorderBlock(fromIdx, dropIdx > fromIdx ? dropIdx - 1 : dropIdx);
          }
        }
        blockDragRef.current = null;
        setBlockDrag(null);
        setScriptDrag(null);
        setCanvasCursor(CURSOR_PEN);
        return;
      }

      isDraggingRef.current = false;
      dragAnchorRef.current = null;
      if (selAnchor && selAnchor.charIndex === cursor.charIndex) {
        setSelAnchor(null);
      }
    },
    [selAnchor, cursor, blockDrag, scriptDrag, containerSize, doc, reorderBlock]
  );

  // 選択範囲を削除して新しいテキストに置き換え
  // handleKeyDown より前に置かないと hoisting で React Compiler に怒られる
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

      if (e.key === "Escape") {
        e.preventDefault();
        setBlockPicker(null);
        setSelAnchor(null);
        return;
      }

      // 話者欄が空の時に数字キー(1-9)で登場人物を選択
      if (
        block.type === "serif" &&
        field === "speaker" &&
        (block.speaker || "").length === 0 &&
        castNames.length > 0 &&
        /^[1-9]$/.test(e.key)
      ) {
        const idx = Number(e.key) - 1;
        if (idx < castNames.length) {
          e.preventDefault();
          pushHistory();
          updateDoc((d) => {
            const nb = [...d.blocks];
            const b = { ...nb[blockIndex] } as any;
            b.speaker = castNames[idx];
            nb[blockIndex] = b;
            return { ...d, blocks: nb };
          });
          setCursor({ blockIndex, field: "speech", charIndex: 0 });
          return;
        }
      }
      // Shift+Enter: ブロック内改行
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        if (block.type === "castList") return; // castListは対象外
        insertTextAtCursor("\n");
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        pushHistory();
        if (block.type === "castList") {
          // Enter: 次の人物へ（末尾なら新規追加）
          const idx = cursor.castIndex ?? 0;
          const nextIdx = idx + 1;
          updateDoc((d) => {
            const nb = [...d.blocks];
            const b = { ...nb[blockIndex] } as any;
            const characters = [...(b.characters || [])];
            while (characters.length <= nextIdx) characters.push({ name: "", description: "" });
            b.characters = characters;
            nb[blockIndex] = b;
            return { ...d, blocks: nb };
          });
          setCursor({ ...cursor, castIndex: nextIdx, charIndex: 0 });
          return;
        }
        if (block.type === "title" && field === "title") {
          setCursor({ blockIndex, field: "author", charIndex: 0 });
          return;
        }
        if (block.type === "serif" && field === "speaker") {
          setCursor({ blockIndex, field: "speech", charIndex: 0 });
          return;
        }
        // 共通: 末尾なら同種別の新規ブロックを下に追加、途中なら分割
        const fullText = getFieldText(cursor);
        const pre = fullText.slice(0, charIndex);
        const post = fullText.slice(charIndex);
        // 新規ブロックの生成
        const makeBlock = (text: string): Block => {
          switch (block.type) {
            case "togaki": return { type: "togaki", text };
            case "sceneHeading": return { type: "sceneHeading", text };
            case "endMark": return { type: "endMark", text };
            case "serif": return { type: "serif", speaker: "", speech: text };
            default: return { type: "serif", speaker: "", speech: text };
          }
        };
        updateDoc((d) => {
          const nb = [...d.blocks];
          // 既存ブロックの末尾を分割（preを残す）
          const cur_b = { ...nb[blockIndex] } as any;
          if (cur_b.type === "serif") cur_b.speech = pre;
          else cur_b.text = pre;
          nb[blockIndex] = cur_b;
          // 後続をpostで新規ブロックに
          nb.splice(blockIndex + 1, 0, makeBlock(post));
          return { ...d, blocks: nb };
        });
        // 新規セリフブロックは話者欄から始める（候補ピッカーが出る）
        const newField: CursorPosition["field"] = block.type === "serif" ? "speaker" : "text";
        setCursor({ blockIndex: blockIndex + 1, field: newField, charIndex: 0 });
        // 新規ブロック作成直後にピッカーを表示
        setBlockPicker({ blockIndex: blockIndex + 1 });
        return;
      }

      // Shift+Tab : セリフ ↔ ト書き を切替
      if (e.key === "Tab" && e.shiftKey && (block.type === "serif" || block.type === "togaki")) {
        e.preventDefault();
        changeBlockType(blockIndex, block.type === "serif" ? "togaki" : "serif");
        return;
      }

      // Tab: 次のフィールド/ブロックへ移動
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        // title: title → author
        if (block.type === "title" && field === "title") {
          setCursor({ blockIndex, field: "author", charIndex: 0 });
          return;
        }
        // serif: speaker → speech
        if (block.type === "serif" && field === "speaker") {
          setCursor({ blockIndex, field: "speech", charIndex: 0 });
          return;
        }
        // castList: 次の人物
        if (block.type === "castList") {
          const idx = cursor.castIndex ?? 0;
          if (idx < block.characters.length - 1) {
            setCursor({ ...cursor, castIndex: idx + 1, charIndex: 0 });
            return;
          }
        }
        // 次のブロックの先頭へ
        const targetIdx = blockIndex + 1;
        const nb = doc.blocks[targetIdx];
        if (!nb) return;
        const nField: CursorPosition["field"] =
          nb.type === "serif" ? "speaker"
          : nb.type === "title" ? "title"
          : "text";
        const nextCursor: CursorPosition = { blockIndex: targetIdx, field: nField, charIndex: 0 };
        if (nb.type === "castList") {
          nextCursor.castIndex = 0;
        }
        setCursor(nextCursor);
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        if (block.type === "castList") {
          pushHistory();
          const idx = cursor.castIndex ?? 0;
          const name = block.characters[idx]?.name || "";
          if (charIndex > 0) {
            const newName = name.slice(0, charIndex - 1) + name.slice(charIndex);
            updateDoc((d) => {
              const nb = [...d.blocks];
              const b = { ...nb[blockIndex] } as any;
              const characters = [...(b.characters || [])];
              characters[idx] = { ...characters[idx], name: newName };
              b.characters = characters;
              nb[blockIndex] = b;
              return { ...d, blocks: nb };
            });
            setCursor({ ...cursor, charIndex: charIndex - 1 });
          } else if (name === "" && idx > 0) {
            // 空の人物を削除して前の人物末尾へ
            updateDoc((d) => {
              const nb = [...d.blocks];
              const b = { ...nb[blockIndex] } as any;
              b.characters = (b.characters || []).filter((_: any, i: number) => i !== idx);
              nb[blockIndex] = b;
              return { ...d, blocks: nb };
            });
            const prevName = block.characters[idx - 1]?.name || "";
            setCursor({ ...cursor, castIndex: idx - 1, charIndex: prevName.length });
          } else if (charIndex === 0 && idx === 0 && name === "" && doc.blocks.length > 1) {
            // すべての人物が空 → 登場人物ブロックごと削除
            const allEmpty = block.characters.every((c) => (c.name || "") === "");
            if (allEmpty) {
              updateDoc((d) => ({ ...d, blocks: d.blocks.filter((_, i) => i !== blockIndex) }));
              const pi = Math.max(0, blockIndex - 1);
              const pb = doc.blocks[pi];
              const pf: CursorPosition["field"] = pb?.type === "serif" ? "speech" : pb?.type === "title" ? "title" : "text";
              setCursor({ blockIndex: pi, field: pf, charIndex: getFieldText({ blockIndex: pi, field: pf, charIndex: 0 }).length });
            }
          }
          return;
        }
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
        } else if (
          (block.type === "sceneHeading" || block.type === "endMark" || block.type === "togaki") &&
          text === "" &&
          doc.blocks.length > 1
        ) {
          // 空の場面/終幕/ト書きブロックを削除
          updateDoc((d) => ({ ...d, blocks: d.blocks.filter((_, i) => i !== blockIndex) }));
          const pi = Math.max(0, blockIndex - 1);
          const pb = doc.blocks[pi];
          const pf: CursorPosition["field"] = pb?.type === "serif" ? "speech" : pb?.type === "title" ? "title" : "text";
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
  // 全ページ数。docから直接計算してJSXに渡す（renderと描画のレース回避）
  const maxPage = mode === "script" ? getMaxPage(computeColumns(doc)) : 0;
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

        <ToolBtn label="タイトル" onClick={() => insertBlock({ type: "title", title: "", author: "" })} />
        <ToolBtn label="登場人物" onClick={() => insertBlock({ type: "castList", characters: [] })} />
        <ToolBtn label="シーン" onClick={() => insertBlock({ type: "sceneHeading", text: "" })} />
        <ToolBtn label="セリフ" shortcut="Enter" onClick={() => insertBlock({ type: "serif", speaker: "", speech: "" })} />
        <ToolBtn label="ト書き" onClick={() => insertBlock({ type: "togaki", text: "" })} />
        <ToolBtn label="終幕" onClick={() => insertBlock({ type: "endMark", text: "おわり" })} />

        <div className="mx-1 h-4 w-px bg-gray-200" />
        <ToolBtn label="元に戻す" shortcut="⌘Z" onClick={undo} />

        <div className="mx-1 h-4 w-px bg-gray-200" />
        <ToolBtn label="PDF出力" onClick={() => exportPdf(doc)} />

        <div className="mx-1 h-4 w-px bg-gray-200" />
        <ToolBtn label={showPanel ? "パネル非表示" : "パネル"} onClick={() => setShowPanel((v) => !v)} />

        <div className="flex-1" />

        {mode === "script" && maxPage > 0 && (
          <span className="text-xs text-gray-400 mr-3">{maxPage + 1}ページ</span>
        )}
        <span className="text-xs text-gray-400">{doc.blocks.length}ブロック</span>
        {statusLabel && (
          <span className={`text-xs ml-3 ${saveStatus === "error" ? "text-red-500" : "text-gray-400"}`}>{statusLabel}</span>
        )}
      </div>

      {/* 入力フィールド（IME対応・カーソル位置に追従、uncontrolled） */}
      <input
        ref={inputRef}
        type="text"
        defaultValue=""
        onKeyDown={(e) => {
          if (isComposingRef.current) return;
          // 通常キー（Enter, Backspace, 矢印など）はエディタ操作へ
          handleKeyDown(e as any);
        }}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionUpdate={(e) => {
          const data = (e as any).data || "";
          // 話者ピッカー表示中で数字1-9が来たら話者選択（IME経由でも反応）
          const cb = doc.blocks[cursor.blockIndex];
          if (
            cb?.type === "serif" &&
            cursor.field === "speaker" &&
            (cb.speaker || "").length === 0 &&
            castNames.length > 0 &&
            /^[1-9]$/.test(data)
          ) {
            const idx = Number(data) - 1;
            if (idx < castNames.length) {
              skipCompositionEndRef.current = true;
              setComposingText("");
              pushHistory();
              updateDoc((d) => {
                const nb = [...d.blocks];
                const b = { ...nb[cursor.blockIndex] } as any;
                b.speaker = castNames[idx];
                nb[cursor.blockIndex] = b;
                return { ...d, blocks: nb };
              });
              setCursor({ blockIndex: cursor.blockIndex, field: "speech", charIndex: 0 });
              return;
            }
          }
          setComposingText(data);
        }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          setComposingText("");
          if (inputRef.current) inputRef.current.value = "";
          if (skipCompositionEndRef.current) {
            skipCompositionEndRef.current = false;
            return;
          }
          const finalText = (e as any).data || "";
          if (finalText) insertTextAtCursor(finalText);
        }}
        onInput={(e) => {
          // IME中はcompositionupdate側で処理するので何もしない
          if (isComposingRef.current) return;
          const v = (e.currentTarget as HTMLInputElement).value;
          if (v) {
            (e.currentTarget as HTMLInputElement).value = "";
            insertTextAtCursor(v);
          }
        }}
        style={{
          position: "fixed",
          left: inputPos ? inputPos.left : 10,
          top: inputPos ? inputPos.top : 10,
          width: 2,
          height: inputPos ? inputPos.height : 20,
          fontSize: 16,
          border: "none",
          outline: "none",
          padding: 0,
          margin: 0,
          background: "transparent",
          color: "transparent",
          caretColor: "transparent",
          opacity: 0.01,
          zIndex: 10,
        }}
        autoFocus
      />

      {/* 話者ピッカー（話者欄が空の時、登場人物リストを数字キー対応で表示） */}
      {inputPos &&
        doc.blocks[cursor.blockIndex]?.type === "serif" &&
        cursor.field === "speaker" &&
        ((doc.blocks[cursor.blockIndex] as any).speaker || "").length === 0 &&
        castNames.length > 0 && (
          <div
            className="fixed z-40 flex flex-col gap-0.5 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
            style={{
              left: inputPos.left - 20,
              top: Math.max(8, inputPos.top - 120),
              minWidth: 120,
              transform: "translateX(-100%)",
            }}
          >
            <p className="px-2 pb-0.5 text-[10px] uppercase tracking-wider text-gray-400">話者を選択</p>
            {castNames.map((name, idx) => (
              <button
                key={idx}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  pushHistory();
                  updateDoc((d) => {
                    const nb = [...d.blocks];
                    const b = { ...nb[cursor.blockIndex] } as any;
                    b.speaker = name;
                    nb[cursor.blockIndex] = b;
                    return { ...d, blocks: nb };
                  });
                  setCursor({ blockIndex: cursor.blockIndex, field: "speech", charIndex: 0 });
                }}
                className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                <span>{name}</span>
                {idx < 9 && <kbd className="text-[10px] text-gray-400">{idx + 1}</kbd>}
              </button>
            ))}
          </div>
        )}

      {/* ブロック種別ピッカー（Enter直後にカーソル近くに表示） */}
      {blockPicker && inputPos && (() => {
        // 話者ピッカー表示中はその上に積む
        const speakerPickerShown =
          doc.blocks[cursor.blockIndex]?.type === "serif" &&
          cursor.field === "speaker" &&
          ((doc.blocks[cursor.blockIndex] as any).speaker || "").length === 0 &&
          castNames.length > 0;
        const baseTop = inputPos.top - 120;
        const top = Math.max(8, speakerPickerShown ? baseTop - 220 : baseTop);
        return (
        <div
          className="fixed z-40 flex gap-1 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg"
          style={{
            left: inputPos.left - 20,
            top,
            transform: "translateX(-100%)",
          }}
        >
          {([
            { type: "serif", label: "セリフ" },
            { type: "togaki", label: "ト書き" },
          ] as { type: Block["type"]; label: string }[]).map((t) => (
            <button
              key={t.type}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                changeBlockType(blockPicker.blockIndex, t.type);
                setBlockPicker(null);
              }}
              className={`rounded px-2 py-1 text-xs hover:bg-gray-100 ${
                doc.blocks[blockPicker.blockIndex]?.type === t.type ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-1 mr-1 self-center text-[10px] text-gray-400 whitespace-nowrap">Shift + Tab</span>
        </div>
        );
      })()}

      {/* Canvas + Side Panel */}
      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="relative flex-1 bg-gray-100 overflow-auto flex flex-col items-center py-4 gap-4">
          {mode === "script" ? (
            Array.from({ length: maxPage + 1 }, (_, page) => (
              <div
                key={page}
                className="shadow-lg shrink-0"
                style={{ width: PAGE_W * scriptScale, height: PAGE_H * scriptScale }}
              >
                <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scriptScale})`, transformOrigin: "top left" }}>
                  <canvas
                    ref={(el) => {
                      if (el) scriptCanvasRefs.current.set(page, el);
                      else scriptCanvasRefs.current.delete(page);
                    }}
                    data-page={page}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onContextMenu={handleContextMenu}
                    style={{ width: PAGE_W, height: PAGE_H, cursor: canvasCursor, background: "#fff" }}
                  />
                </div>
              </div>
            ))
          ) : (
            <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onContextMenu={handleContextMenu}
 className="absolute inset-0" style={{ width: "100%", height: "100%", cursor: canvasCursor }} />
          )}
        </div>
        {/* コンテキストメニュー */}
        {contextMenu && (() => {
          const hasSelection = !!(selAnchor && (selAnchor.blockIndex !== cursor.blockIndex || selAnchor.field !== cursor.field || selAnchor.charIndex !== cursor.charIndex));
          const curBlock = doc.blocks[cursor.blockIndex];
          const curType = curBlock?.type;
          const close = () => setContextMenu(null);
          const insertAfter = (b: Block) => { insertBlock(b); close(); };
          const changeTo = (t: Block["type"]) => { changeBlockType(cursor.blockIndex, t); close(); };
          const MenuItem = ({ label, onClick, danger, shortcut }: { label: string; onClick: () => void; danger?: boolean; shortcut?: string }) => (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick}
              className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-sm ${danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-100"}`}>
              <span>{label}</span>
              {shortcut && <kbd className="text-[10px] text-gray-400">{shortcut}</kbd>}
            </button>
          );
          const Divider = () => <div className="my-0.5 border-t border-gray-100" />;
          return (
            <div
              className="fixed z-50 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {hasSelection ? (
                <>
                  <MenuItem label="コピー" onClick={() => { ctxMenuCopy(); }} shortcut="⌘C" />
                  <MenuItem label="ペースト（置換）" onClick={() => { ctxMenuPaste(); }} shortcut="⌘V" />
                  <Divider />
                  <MenuItem label="選択範囲を削除" danger onClick={() => {
                    const text = getFieldText(cursor);
                    const start = Math.min(selAnchor!.charIndex, cursor.charIndex);
                    const end = Math.max(selAnchor!.charIndex, cursor.charIndex);
                    const newText = text.slice(0, start) + text.slice(end);
                    pushHistory();
                    updateDoc((d) => {
                      const nb = [...d.blocks];
                      const b = { ...nb[cursor.blockIndex] } as any;
                      if (b.type === "title") { if (cursor.field === "title") b.title = newText; else b.author = newText; }
                      else if (b.type === "serif") { if (cursor.field === "speaker") b.speaker = newText; else b.speech = newText; }
                      else b.text = newText;
                      nb[cursor.blockIndex] = b;
                      return { ...d, blocks: nb };
                    });
                    setCursor({ ...cursor, charIndex: start });
                    setSelAnchor(null);
                    close();
                  }} />
                  <MenuItem label="選択を解除" onClick={() => { setSelAnchor(null); close(); }} />
                </>
              ) : (
                <>
                  <MenuItem label="コピー（フィールド全体）" onClick={() => { ctxMenuCopy(); }} shortcut="⌘C" />
                  <MenuItem label="ペースト" onClick={() => { ctxMenuPaste(); }} shortcut="⌘V" />
                  <MenuItem label="すべて選択" onClick={() => { ctxMenuSelectAll(); }} shortcut="⌘A" />
                  <Divider />
                  <MenuItem label="下にセリフを追加" onClick={() => insertAfter({ type: "serif", speaker: "", speech: "" })} />
                  <MenuItem label="下にト書きを追加" onClick={() => insertAfter({ type: "togaki", text: "" })} />
                  <MenuItem label="下にシーンを追加" onClick={() => insertAfter({ type: "sceneHeading", text: "" })} />
                  <MenuItem label="下にタイトルを追加" onClick={() => insertAfter({ type: "title", title: "", author: "" })} />
                  <MenuItem label="下に登場人物を追加" onClick={() => insertAfter({ type: "castList", characters: [] })} />
                  <Divider />
                  {curType && curType !== "title" && curType !== "castList" && (
                    <>
                      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-400">種別変更</div>
                      {curType !== "serif" && <MenuItem label="→ セリフ" onClick={() => changeTo("serif")} />}
                      {curType !== "togaki" && <MenuItem label="→ ト書き" onClick={() => changeTo("togaki")} />}
                      {curType !== "sceneHeading" && <MenuItem label="→ シーン" onClick={() => changeTo("sceneHeading")} />}
                      {curType !== "endMark" && <MenuItem label="→ 終幕" onClick={() => changeTo("endMark")} />}
                      <Divider />
                    </>
                  )}
                  <MenuItem label="ブロックを上に移動" onClick={() => { moveBlock(cursor.blockIndex, "up"); close(); }} shortcut="⌘⇧↑" />
                  <MenuItem label="ブロックを下に移動" onClick={() => { moveBlock(cursor.blockIndex, "down"); close(); }} shortcut="⌘⇧↓" />
                  <Divider />
                  <MenuItem label="このブロックを削除" danger onClick={() => { deleteBlock(cursor.blockIndex); close(); }} />
                </>
              )}
            </div>
          );
        })()}

        {showPanel && (
          <BlockPanel
            doc={doc}
            cursor={cursor}
            onMoveBlock={moveBlock}
            onReorderBlock={reorderBlock}
            onDeleteBlock={deleteBlock}
            onChangeBlockType={changeBlockType}
            onSelectBlock={selectBlock}
            onInsertBlock={insertBlock}
            onUpdateBlock={updateBlockAt}
          />
        )}
      </div>
    </div>
  );
}

function ModeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded transition-colors ${active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
      {label}
    </button>
  );
}

function ToolBtn({ label, shortcut, onClick }: { label: string; shortcut?: string; onClick: () => void }) {
  return (
    <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={shortcut ? `${label} (${shortcut})` : label}
      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
      {label}
      {shortcut && <kbd className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded px-1">{shortcut}</kbd>}
    </button>
  );
}
