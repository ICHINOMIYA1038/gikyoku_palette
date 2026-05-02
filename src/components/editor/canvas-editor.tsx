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
import { savePlayBody } from "@/actions/plays";

// ─── 共通定数 ───
const FONT_SIZE = 24;
const SPEAKER_FONT_SIZE = 18;
const BODY_FONT = `${FONT_SIZE}px "Noto Serif JP", "游明朝", serif`;
const SPEAKER_FONT = `bold ${SPEAKER_FONT_SIZE}px "Noto Serif JP", "游明朝", serif`;

export type EditorMode = "horizontal" | "script";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  playId: string;
  initialContent: Record<string, unknown> | null;
};

// ═══════════════════════════════════════
//  横書きレイアウト
// ═══════════════════════════════════════
const H_MARGIN = { top: 24, left: 30, right: 30 };
const H_ROW_H = 44; // 1行の高さ
const H_SPEAKER_W = 120; // 話者名エリア幅
const H_SEP_X_OFFSET = H_SPEAKER_W + 10; // 区切り線X

function drawHorizontal(
  ctx: CanvasRenderingContext2D,
  doc: PlayDocument,
  cursor: CursorPosition | null,
  w: number,
  h: number
) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "middle";

  const contentLeft = H_MARGIN.left;
  const sepX = contentLeft + H_SEP_X_OFFSET;
  const speechLeft = sepX + 16;

  for (let bi = 0; bi < doc.blocks.length; bi++) {
    const block = doc.blocks[bi];
    const y = H_MARGIN.top + bi * H_ROW_H;
    const cy = y + H_ROW_H / 2;

    // 行の区切り線（下）
    if (bi < doc.blocks.length - 1) {
      ctx.strokeStyle = "#eee";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(contentLeft, y + H_ROW_H);
      ctx.lineTo(w - H_MARGIN.right, y + H_ROW_H);
      ctx.stroke();
    }

    if (block.type === "serif") {
      // 話者名
      ctx.font = SPEAKER_FONT;
      ctx.fillStyle = "#111";
      ctx.fillText(block.speaker || "", contentLeft, cy);

      // 区切り線（縦）
      ctx.strokeStyle = "#d0d0d0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sepX, y + 6);
      ctx.lineTo(sepX, y + H_ROW_H - 6);
      ctx.stroke();

      // セリフ
      ctx.font = BODY_FONT;
      ctx.fillStyle = "#1a1a1a";
      ctx.fillText(block.speech || "", speechLeft, cy);

      // カーソル
      if (cursor && cursor.blockIndex === bi) {
        ctx.fillStyle = "#1a73e8";
        if (cursor.field === "speaker") {
          const textBefore = (block.speaker || "").slice(0, cursor.charIndex);
          const cx = contentLeft + ctx.measureText(textBefore).width;
          ctx.font = SPEAKER_FONT;
          const cxMeasured = contentLeft + ctx.measureText(textBefore).width;
          ctx.fillRect(cxMeasured, y + 6, 2, H_ROW_H - 12);
        } else {
          ctx.font = BODY_FONT;
          const textBefore = (block.speech || "").slice(0, cursor.charIndex);
          const cx = speechLeft + ctx.measureText(textBefore).width;
          ctx.fillRect(cx, y + 6, 2, H_ROW_H - 12);
        }
      }
    } else if (block.type === "togaki") {
      ctx.font = BODY_FONT;
      ctx.fillStyle = "#666";
      ctx.fillText(`　${block.text || ""}`, speechLeft, cy);
      if (cursor && cursor.blockIndex === bi && cursor.field === "text") {
        const textBefore = (block.text || "").slice(0, cursor.charIndex);
        ctx.fillStyle = "#1a73e8";
        const cx = speechLeft + ctx.measureText(`　${textBefore}`).width;
        ctx.fillRect(cx, y + 6, 2, H_ROW_H - 12);
      }
    } else if (block.type === "sceneHeading") {
      ctx.font = `bold ${FONT_SIZE}px "Noto Serif JP", serif`;
      ctx.fillStyle = "#111";
      ctx.fillText(block.text || "", contentLeft, cy);
      // 下線
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(contentLeft, y + H_ROW_H - 2);
      ctx.lineTo(w - H_MARGIN.right, y + H_ROW_H - 2);
      ctx.stroke();
      if (cursor && cursor.blockIndex === bi && cursor.field === "text") {
        const textBefore = (block.text || "").slice(0, cursor.charIndex);
        ctx.fillStyle = "#1a73e8";
        const cx = contentLeft + ctx.measureText(textBefore).width;
        ctx.fillRect(cx, y + 6, 2, H_ROW_H - 12);
      }
    }
  }
}

function hitTestHorizontal(
  doc: PlayDocument,
  mx: number,
  my: number
): CursorPosition | null {
  const contentLeft = H_MARGIN.left;
  const sepX = contentLeft + H_SEP_X_OFFSET;
  const speechLeft = sepX + 16;

  const bi = Math.floor((my - H_MARGIN.top) / H_ROW_H);
  if (bi < 0 || bi >= doc.blocks.length) return null;

  const block = doc.blocks[bi];

  if (block.type === "serif") {
    if (mx < sepX) {
      // 話者名エリア — 文字位置はmeasureTextが必要だが簡易的にcharIndex=末尾
      return { blockIndex: bi, field: "speaker", charIndex: block.speaker.length };
    }
    return { blockIndex: bi, field: "speech", charIndex: block.speech.length };
  }
  return { blockIndex: bi, field: "text", charIndex: ((block as any).text || "").length };
}

// ═══════════════════════════════════════
//  縦書き（台本）レイアウト
// ═══════════════════════════════════════
const V_MARGIN = { top: 20, bottom: 20, left: 30, right: 30 };
const V_CHAR_H = FONT_SIZE + 8;
const V_COL_W = FONT_SIZE + 16;
const V_SPEAKER_AREA_H = SPEAKER_FONT_SIZE * 4 + 16;

type ColLayout = {
  blockIndex: number;
  field: "speaker" | "speech" | "text";
  x: number;
  chars: string;
  startCharIndex: number;
};

function computeScriptLayout(canvasH: number) {
  const SEP_Y = V_MARGIN.top + V_SPEAKER_AREA_H;
  const BODY_TOP = SEP_Y + 10;
  const BODY_H = canvasH - V_MARGIN.bottom - BODY_TOP;
  const MAX_CHARS = Math.floor(BODY_H / V_CHAR_H);
  return { SEP_Y, BODY_TOP, BODY_H, MAX_CHARS };
}

function computeColumns(doc: PlayDocument, canvasW: number, canvasH: number): ColLayout[] {
  const { MAX_CHARS } = computeScriptLayout(canvasH);
  const cols: ColLayout[] = [];
  let x = canvasW - V_MARGIN.right - V_COL_W / 2;

  for (let bi = 0; bi < doc.blocks.length; bi++) {
    const block = doc.blocks[bi];
    const fieldName = block.type === "serif" ? "speech" : "text";
    const text = block.type === "serif" ? block.speech || "" : (block as any).text || "";

    if (text.length === 0) {
      cols.push({ blockIndex: bi, field: fieldName as any, x, chars: "", startCharIndex: 0 });
      x -= V_COL_W;
    } else {
      for (let i = 0; i < text.length; i += MAX_CHARS) {
        cols.push({ blockIndex: bi, field: fieldName as any, x, chars: text.slice(i, i + MAX_CHARS), startCharIndex: i });
        x -= V_COL_W;
      }
    }
  }
  return cols;
}

function drawScript(
  ctx: CanvasRenderingContext2D,
  doc: PlayDocument,
  cols: ColLayout[],
  cursor: CursorPosition | null,
  w: number,
  h: number
) {
  const { SEP_Y, BODY_TOP, MAX_CHARS } = computeScriptLayout(h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(V_MARGIN.left, SEP_Y);
  ctx.lineTo(w - V_MARGIN.right, SEP_Y);
  ctx.stroke();

  ctx.textBaseline = "top";
  let prevBlockIndex = -1;

  for (const col of cols) {
    const block = doc.blocks[col.blockIndex];
    const isFirstCol = col.blockIndex !== prevBlockIndex;
    prevBlockIndex = col.blockIndex;

    if (isFirstCol && block.type === "serif") {
      ctx.font = SPEAKER_FONT;
      ctx.fillStyle = "#111";
      for (let i = 0; i < block.speaker.length; i++) {
        const ch = block.speaker[i];
        const charW = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - FONT_SIZE / 2 + (FONT_SIZE - charW) / 2, V_MARGIN.top + i * (SPEAKER_FONT_SIZE + 4));
      }
      if (cursor && cursor.blockIndex === col.blockIndex && cursor.field === "speaker") {
        ctx.fillStyle = "#1a73e8";
        ctx.fillRect(col.x - FONT_SIZE / 2 - 1, V_MARGIN.top + cursor.charIndex * (SPEAKER_FONT_SIZE + 4), FONT_SIZE + 2, 3);
      }
    }

    ctx.font = BODY_FONT;
    ctx.fillStyle = block.type === "togaki" ? "#555" : "#1a1a1a";
    for (let i = 0; i < col.chars.length; i++) {
      const ch = col.chars[i];
      const charW = ctx.measureText(ch).width;
      ctx.fillText(ch, col.x - FONT_SIZE / 2 + (FONT_SIZE - charW) / 2, BODY_TOP + i * V_CHAR_H);
    }

    if (cursor && cursor.blockIndex === col.blockIndex && (cursor.field === "speech" || cursor.field === "text")) {
      const localIdx = cursor.charIndex - col.startCharIndex;
      if (localIdx >= 0 && localIdx <= col.chars.length && (localIdx < MAX_CHARS || col.chars.length < MAX_CHARS)) {
        ctx.fillStyle = "#1a73e8";
        ctx.fillRect(col.x - FONT_SIZE / 2 - 1, BODY_TOP + localIdx * V_CHAR_H, FONT_SIZE + 2, 3);
      }
    }
  }
}

function hitTestScript(
  doc: PlayDocument,
  cols: ColLayout[],
  mx: number,
  my: number,
  canvasH: number
): CursorPosition | null {
  const { SEP_Y, BODY_TOP } = computeScriptLayout(canvasH);

  if (my < SEP_Y) {
    let bestCol: ColLayout | null = null;
    let bestDist = Infinity;
    let prevBI = -1;
    for (const col of cols) {
      if (col.blockIndex !== prevBI) {
        const dist = Math.abs(mx - col.x);
        if (dist < bestDist) { bestDist = dist; bestCol = col; }
        prevBI = col.blockIndex;
      }
    }
    if (bestCol && doc.blocks[bestCol.blockIndex]?.type === "serif") {
      const speaker = (doc.blocks[bestCol.blockIndex] as any).speaker || "";
      const charIdx = Math.min(Math.floor((my - V_MARGIN.top) / (SPEAKER_FONT_SIZE + 4)), speaker.length);
      return { blockIndex: bestCol.blockIndex, field: "speaker", charIndex: Math.max(0, charIdx) };
    }
  }

  let bestCol: ColLayout | null = null;
  let bestDist = Infinity;
  for (const col of cols) {
    const dist = Math.abs(mx - col.x);
    if (dist < bestDist) { bestDist = dist; bestCol = col; }
  }
  if (bestCol) {
    const charInCol = Math.min(Math.floor((my - BODY_TOP) / V_CHAR_H), bestCol.chars.length);
    return {
      blockIndex: bestCol.blockIndex,
      field: bestCol.field as "speech" | "text",
      charIndex: bestCol.startCharIndex + Math.max(0, charInCol),
    };
  }
  return null;
}

// ═══════════════════════════════════════
//  メインコンポーネント
// ═══════════════════════════════════════
export function CanvasEditor({ playId, initialContent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [doc, setDoc] = useState<PlayDocument>(() =>
    initialContent ? fromBodyJson(initialContent) : EMPTY_DOC
  );
  const [cursor, setCursor] = useState<CursorPosition>({
    blockIndex: 0, field: "speaker", charIndex: 0,
  });
  const [mode, setMode] = useState<EditorMode>("script");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
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

  const insertBlock = useCallback(
    (block: Block) => {
      pushHistory();
      const insertAt = cursor.blockIndex + 1;
      updateDoc((d) => {
        const newBlocks = [...d.blocks];
        newBlocks.splice(insertAt, 0, block);
        return { blocks: newBlocks };
      });
      setCursor({ blockIndex: insertAt, field: block.type === "serif" ? "speaker" : "text", charIndex: 0 });
      inputRef.current?.focus();
    },
    [cursor.blockIndex, pushHistory, updateDoc]
  );

  // コンテナサイズ
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 0 && h > 0) setCanvasSize({ w, h });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 描画
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = canvasSize;
    canvas.width = w;
    canvas.height = h;

    if (mode === "script") {
      const cols = computeColumns(doc, w, h);
      colsRef.current = cols;
      drawScript(ctx, doc, cols, cursor, w, h);
    } else {
      colsRef.current = [];
      drawHorizontal(ctx, doc, cursor, w, h);
    }
  }, [doc, cursor, canvasSize, mode]);

  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => { document.fonts.ready.then(() => redraw()); }, [redraw]);

  // フィールドテキスト取得
  const getFieldText = useCallback(
    (pos: CursorPosition, d: PlayDocument = doc): string => {
      const block = d.blocks[pos.blockIndex];
      if (!block) return "";
      if (block.type === "serif") return pos.field === "speaker" ? block.speaker : block.speech;
      return (block as any).text || "";
    },
    [doc]
  );

  // クリック
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvasSize.w / rect.width);
      const my = (e.clientY - rect.top) * (canvasSize.h / rect.height);

      let newCursor: CursorPosition | null;
      if (mode === "script") {
        newCursor = hitTestScript(doc, colsRef.current, mx, my, canvasSize.h);
      } else {
        newCursor = hitTestHorizontal(doc, mx, my);
      }
      if (newCursor) setCursor(newCursor);
      inputRef.current?.focus();
    },
    [doc, canvasSize, mode]
  );

  // キーボード
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); return; }

      const { blockIndex, field, charIndex } = cursor;
      const block = doc.blocks[blockIndex];
      if (!block) return;

      if (e.key === "Enter") {
        e.preventDefault();
        pushHistory();
        if (field === "speaker") {
          setCursor({ blockIndex, field: "speech", charIndex: 0 });
        } else {
          updateDoc((d) => {
            const nb = [...d.blocks];
            nb.splice(blockIndex + 1, 0, { type: "serif", speaker: "", speech: "" });
            return { blocks: nb };
          });
          setCursor({ blockIndex: blockIndex + 1, field: "speaker", charIndex: 0 });
        }
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        pushHistory();
        const text = getFieldText(cursor);
        if (charIndex > 0) {
          const newText = text.slice(0, charIndex - 1) + text.slice(charIndex);
          updateDoc((d) => {
            const nb = [...d.blocks];
            const b = { ...nb[blockIndex] };
            if (b.type === "serif") { if (field === "speaker") b.speaker = newText; else b.speech = newText; }
            else (b as any).text = newText;
            nb[blockIndex] = b as Block;
            return { blocks: nb };
          });
          setCursor({ ...cursor, charIndex: charIndex - 1 });
        } else if (field === "speech" && text === "") {
          setCursor({ blockIndex, field: "speaker", charIndex: getFieldText({ blockIndex, field: "speaker", charIndex: 0 }).length });
        } else if (field === "speaker" && text === "" && block.type === "serif" && (block as any).speech === "" && doc.blocks.length > 1) {
          updateDoc((d) => ({ blocks: d.blocks.filter((_, i) => i !== blockIndex) }));
          const pi = Math.max(0, blockIndex - 1);
          const pb = doc.blocks[pi];
          setCursor({ blockIndex: pi, field: pb?.type === "serif" ? "speech" : "text", charIndex: getFieldText({ blockIndex: pi, field: pb?.type === "serif" ? "speech" : "text", charIndex: 0 }).length });
        }
        return;
      }

      if (e.key === "ArrowDown" || (mode === "horizontal" && e.key === "ArrowRight")) {
        e.preventDefault();
        const text = getFieldText(cursor);
        if (charIndex < text.length) setCursor({ ...cursor, charIndex: charIndex + 1 });
        return;
      }
      if (e.key === "ArrowUp" || (mode === "horizontal" && e.key === "ArrowLeft")) {
        e.preventDefault();
        if (charIndex > 0) setCursor({ ...cursor, charIndex: charIndex - 1 });
        return;
      }
      if ((mode === "script" && e.key === "ArrowLeft") || (mode === "horizontal" && e.key === "ArrowDown")) {
        e.preventDefault();
        if (blockIndex < doc.blocks.length - 1) {
          const nb = doc.blocks[blockIndex + 1];
          setCursor({ blockIndex: blockIndex + 1, field: nb.type === "serif" ? "speaker" : "text", charIndex: 0 });
        }
        return;
      }
      if ((mode === "script" && e.key === "ArrowRight") || (mode === "horizontal" && e.key === "ArrowUp")) {
        e.preventDefault();
        if (blockIndex > 0) {
          const pb = doc.blocks[blockIndex - 1];
          setCursor({ blockIndex: blockIndex - 1, field: pb.type === "serif" ? "speaker" : "text", charIndex: 0 });
        }
        return;
      }
    },
    [cursor, doc, getFieldText, updateDoc, pushHistory, undo, mode]
  );

  // テキスト入力
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      const input = e.currentTarget;
      const value = input.value;
      if (!value) return;
      input.value = "";
      pushHistory();
      const { blockIndex, field, charIndex } = cursor;
      const text = getFieldText(cursor);
      const newText = text.slice(0, charIndex) + value + text.slice(charIndex);
      updateDoc((d) => {
        const nb = [...d.blocks];
        const b = { ...nb[blockIndex] };
        if (b.type === "serif") { if (field === "speaker") b.speaker = newText; else b.speech = newText; }
        else (b as any).text = newText;
        nb[blockIndex] = b as Block;
        return { blocks: nb };
      });
      setCursor({ ...cursor, charIndex: charIndex + value.length });
    },
    [cursor, getFieldText, updateDoc, pushHistory]
  );

  const statusLabel = saveStatus === "idle" ? "" : saveStatus === "saving" ? "保存中..." : saveStatus === "error" ? "保存エラー" : "保存済み";

  return (
    <div className="flex flex-col h-full">
      {/* ツールバー */}
      <div className="flex items-center gap-1 bg-white border-b border-gray-200 px-3 py-1 shrink-0">
        {/* モード切替 */}
        <div className="flex items-center bg-gray-100 rounded-md p-0.5 mr-2">
          <button type="button" onClick={() => setMode("horizontal")}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${mode === "horizontal" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
            横書き
          </button>
          <button type="button" onClick={() => setMode("script")}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${mode === "script" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
            台本
          </button>
        </div>

        <div className="mx-1 h-4 w-px bg-gray-200" />

        <ToolBtn label="セリフ" shortcut="Enter" onClick={() => insertBlock({ type: "serif", speaker: "", speech: "" })} />
        <ToolBtn label="ト書き" onClick={() => insertBlock({ type: "togaki", text: "" })} />
        <ToolBtn label="場面" onClick={() => insertBlock({ type: "sceneHeading", text: "" })} />

        <div className="mx-1 h-4 w-px bg-gray-200" />
        <ToolBtn label="元に戻す" shortcut="⌘Z" onClick={undo} />

        <div className="flex-1" />
        <span className="text-xs text-gray-400">{doc.blocks.length}ブロック</span>
        {statusLabel && (
          <span className={`text-xs ml-3 ${saveStatus === "error" ? "text-red-500" : "text-gray-400"}`}>{statusLabel}</span>
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 bg-gray-50">
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="absolute inset-0 cursor-text"
          style={{ width: "100%", height: "100%" }}
        />
        <textarea
          ref={inputRef}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          className="absolute opacity-0 w-0 h-0"
          style={{ top: 0, left: 0 }}
          autoFocus
        />
      </div>
    </div>
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
