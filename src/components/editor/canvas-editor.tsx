"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  type PlayDocument,
  type CursorPosition,
  type Block,
  EMPTY_DOC,
  fromBodyJson,
  toBodyJson,
  toPlainText,
} from "@/lib/editor/play-document";
import { savePlayBody } from "@/actions/plays";

// ─── レイアウト定数（ビューポート適応・台本形式） ───
const FONT_SIZE = 24;
const SPEAKER_FONT_SIZE = 18;
const CHAR_H = FONT_SIZE + 8; // 文字送りピッチ（縦方向）
const COL_W = FONT_SIZE + 16; // 列幅
const MARGIN = { top: 20, bottom: 20, left: 30, right: 30 };
const SPEAKER_AREA_H = SPEAKER_FONT_SIZE * 4 + 16; // 話者名エリア高さ

const BODY_FONT = `${FONT_SIZE}px "Noto Serif JP", "游明朝", serif`;
const SPEAKER_FONT = `bold ${SPEAKER_FONT_SIZE}px "Noto Serif JP", "游明朝", serif`;

// 動的に計算される値（Canvasサイズに依存）
function computeLayout(canvasH: number) {
  const SEP_Y = MARGIN.top + SPEAKER_AREA_H;
  const BODY_TOP = SEP_Y + 10;
  const BODY_H = canvasH - MARGIN.bottom - BODY_TOP;
  const MAX_CHARS = Math.floor(BODY_H / CHAR_H);
  return { SEP_Y, BODY_TOP, BODY_H, MAX_CHARS };
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  playId: string;
  initialContent: Record<string, unknown> | null;
};

// ─── 列レイアウト計算 ───
type ColLayout = {
  blockIndex: number;
  field: "speaker" | "speech" | "text";
  x: number; // 列のX座標（中心）
  chars: string; // この列に表示する文字列
  startCharIndex: number; // 元テキスト中の開始位置
};

function computeColumns(doc: PlayDocument, canvasW: number, canvasH: number): ColLayout[] {
  const { MAX_CHARS } = computeLayout(canvasH);
  const cols: ColLayout[] = [];
  let x = canvasW - MARGIN.right - COL_W / 2; // 右端から開始

  for (let bi = 0; bi < doc.blocks.length; bi++) {
    const block = doc.blocks[bi];

    if (block.type === "serif") {
      const speech = block.speech || "";
      if (speech.length === 0) {
        cols.push({ blockIndex: bi, field: "speech", x, chars: "", startCharIndex: 0 });
        x -= COL_W;
      } else {
        for (let i = 0; i < speech.length; i += MAX_CHARS) {
          cols.push({ blockIndex: bi, field: "speech", x, chars: speech.slice(i, i + MAX_CHARS), startCharIndex: i });
          x -= COL_W;
        }
      }
    } else {
      const text = (block as any).text || "";
      if (text.length === 0) {
        cols.push({ blockIndex: bi, field: "text", x, chars: "", startCharIndex: 0 });
        x -= COL_W;
      } else {
        for (let i = 0; i < text.length; i += MAX_CHARS) {
          cols.push({ blockIndex: bi, field: "text", x, chars: text.slice(i, i + MAX_CHARS), startCharIndex: i });
          x -= COL_W;
        }
      }
    }
  }

  return cols;
}

// ─── Canvas描画 ───
function draw(
  ctx: CanvasRenderingContext2D,
  doc: PlayDocument,
  cols: ColLayout[],
  cursor: CursorPosition | null,
  w: number,
  h: number
) {
  const { SEP_Y, BODY_TOP, MAX_CHARS } = computeLayout(h);

  ctx.clearRect(0, 0, w, h);

  // 背景
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);

  // 区切り線
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN.left, SEP_Y);
  ctx.lineTo(w - MARGIN.right, SEP_Y);
  ctx.stroke();

  ctx.textBaseline = "top";

  // 各列の描画
  let prevBlockIndex = -1;
  for (const col of cols) {
    const block = doc.blocks[col.blockIndex];
    const isFirstColOfBlock = col.blockIndex !== prevBlockIndex;
    prevBlockIndex = col.blockIndex;

    // 話者名（各ブロックの最初の列にのみ描画）
    if (isFirstColOfBlock && block.type === "serif") {
      ctx.font = SPEAKER_FONT;
      ctx.fillStyle = "#111";
      const speaker = block.speaker || "";
      for (let i = 0; i < speaker.length; i++) {
        const charW = ctx.measureText(speaker[i]).width;
        const offsetX = (FONT_SIZE - charW) / 2;
        ctx.fillText(
          speaker[i],
          col.x - FONT_SIZE / 2 + offsetX,
          MARGIN.top + i * (SPEAKER_FONT_SIZE + 4)
        );
      }

      // 話者名カーソル
      if (
        cursor &&
        cursor.blockIndex === col.blockIndex &&
        cursor.field === "speaker"
      ) {
        const cy = MARGIN.top + cursor.charIndex * (SPEAKER_FONT_SIZE + 4);
        ctx.fillStyle = "#1a73e8";
        ctx.fillRect(col.x - FONT_SIZE / 2 - 1, cy, FONT_SIZE + 2, 3);
      }
    }

    // セリフ / テキスト
    ctx.font = BODY_FONT;
    ctx.fillStyle = block.type === "togaki" ? "#555" : "#1a1a1a";

    for (let i = 0; i < col.chars.length; i++) {
      const ch = col.chars[i];
      const charW = ctx.measureText(ch).width;
      const offsetX = (FONT_SIZE - charW) / 2;
      ctx.fillText(ch, col.x - FONT_SIZE / 2 + offsetX, BODY_TOP + i * CHAR_H);
    }

    // セリフカーソル
    if (
      cursor &&
      cursor.blockIndex === col.blockIndex &&
      (cursor.field === "speech" || cursor.field === "text")
    ) {
      const localIndex = cursor.charIndex - col.startCharIndex;
      if (localIndex >= 0 && localIndex <= col.chars.length && (localIndex < MAX_CHARS || col.chars.length < MAX_CHARS)) {
        const cy = BODY_TOP + localIndex * CHAR_H;
        ctx.fillStyle = "#1a73e8";
        ctx.fillRect(col.x - FONT_SIZE / 2 - 1, cy, FONT_SIZE + 2, 3);
      }
    }
  }
}

// ─── メインコンポーネント ───
export function CanvasEditor({ playId, initialContent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [doc, setDoc] = useState<PlayDocument>(() =>
    initialContent ? fromBodyJson(initialContent) : EMPTY_DOC
  );
  const [cursor, setCursor] = useState<CursorPosition>({
    blockIndex: 0,
    field: "speaker",
    charIndex: 0,
  });
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
        } catch {
          setSaveStatus("error");
        }
      }, 800);
    },
    [playId]
  );

  // ドキュメント更新
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
      setCursor((c) => ({
        ...c,
        blockIndex: Math.min(c.blockIndex, prev.blocks.length - 1),
      }));
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
      setCursor({
        blockIndex: insertAt,
        field: block.type === "serif" ? "speaker" : "text",
        charIndex: 0,
      });
      inputRef.current?.focus();
    },
    [cursor.blockIndex, pushHistory, updateDoc]
  );

  // コンテナサイズ監視
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
    const cols = computeColumns(doc, w, h);
    colsRef.current = cols;
    draw(ctx, doc, cols, cursor, w, h);
  }, [doc, cursor, canvasSize]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    document.fonts.ready.then(() => redraw());
  }, [redraw]);

  // 現在のフィールドのテキストを取得
  const getFieldText = useCallback(
    (pos: CursorPosition, d: PlayDocument = doc): string => {
      const block = d.blocks[pos.blockIndex];
      if (!block) return "";
      if (block.type === "serif") {
        return pos.field === "speaker" ? block.speaker : block.speech;
      }
      return (block as any).text || "";
    },
    [doc]
  );

  // クリックでカーソル移動
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvasSize.w / rect.width);
      const my = (e.clientY - rect.top) * (canvasSize.h / rect.height);

      // 話者名エリアのクリック
      const { SEP_Y, BODY_TOP, MAX_CHARS } = computeLayout(canvasSize.h);
      if (my < SEP_Y) {
        // 最も近い列を見つける
        let bestCol: ColLayout | null = null;
        let bestDist = Infinity;
        let prevBI = -1;
        for (const col of colsRef.current) {
          if (col.blockIndex !== prevBI) {
            const dist = Math.abs(mx - col.x);
            if (dist < bestDist) {
              bestDist = dist;
              bestCol = col;
            }
            prevBI = col.blockIndex;
          }
        }
        if (bestCol && doc.blocks[bestCol.blockIndex]?.type === "serif") {
          const speaker = (doc.blocks[bestCol.blockIndex] as any).speaker || "";
          const charIdx = Math.min(
            Math.floor((my - MARGIN.top) / (SPEAKER_FONT_SIZE + 3)),
            speaker.length
          );
          setCursor({
            blockIndex: bestCol.blockIndex,
            field: "speaker",
            charIndex: Math.max(0, charIdx),
          });
        }
      } else {
        // セリフエリアのクリック
        let bestCol: ColLayout | null = null;
        let bestDist = Infinity;
        for (const col of colsRef.current) {
          const dist = Math.abs(mx - col.x);
          if (dist < bestDist) {
            bestDist = dist;
            bestCol = col;
          }
        }
        if (bestCol) {
          const charInCol = Math.min(
            Math.floor((my - BODY_TOP) / CHAR_H),
            bestCol.chars.length
          );
          setCursor({
            blockIndex: bestCol.blockIndex,
            field: bestCol.field as "speech" | "text",
            charIndex: bestCol.startCharIndex + Math.max(0, charInCol),
          });
        }
      }

      inputRef.current?.focus();
    },
    [doc, canvasSize]
  );

  // キーボード入力
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const { blockIndex, field, charIndex } = cursor;
      const block = doc.blocks[blockIndex];
      if (!block) return;

      if (e.key === "Enter") {
        e.preventDefault();
        pushHistory();
        if (field === "speaker") {
          // speaker → speech へ移動
          setCursor({ blockIndex, field: "speech", charIndex: 0 });
        } else {
          // speech/text → 新しいserifを作成
          updateDoc((d) => {
            const newBlocks = [...d.blocks];
            newBlocks.splice(blockIndex + 1, 0, {
              type: "serif",
              speaker: "",
              speech: "",
            });
            return { blocks: newBlocks };
          });
          setCursor({
            blockIndex: blockIndex + 1,
            field: "speaker",
            charIndex: 0,
          });
        }
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        pushHistory();
        const text = getFieldText(cursor);
        if (charIndex > 0) {
          // 文字削除
          const newText =
            text.slice(0, charIndex - 1) + text.slice(charIndex);
          updateDoc((d) => {
            const newBlocks = [...d.blocks];
            const b = { ...newBlocks[blockIndex] };
            if (b.type === "serif") {
              if (field === "speaker") b.speaker = newText;
              else b.speech = newText;
            } else {
              (b as any).text = newText;
            }
            newBlocks[blockIndex] = b as Block;
            return { blocks: newBlocks };
          });
          setCursor({ ...cursor, charIndex: charIndex - 1 });
        } else if (field === "speech" && text === "") {
          // 空のspeechでBackspace → speakerへ
          setCursor({
            blockIndex,
            field: "speaker",
            charIndex: getFieldText({
              blockIndex,
              field: "speaker",
              charIndex: 0,
            }).length,
          });
        } else if (
          field === "speaker" &&
          text === "" &&
          block.type === "serif" &&
          (block as any).speech === "" &&
          doc.blocks.length > 1
        ) {
          // 空のserifでBackspace → ブロック削除
          updateDoc((d) => {
            const newBlocks = d.blocks.filter((_, i) => i !== blockIndex);
            return { blocks: newBlocks };
          });
          const prevIdx = Math.max(0, blockIndex - 1);
          const prevBlock = doc.blocks[prevIdx];
          setCursor({
            blockIndex: prevIdx,
            field: prevBlock?.type === "serif" ? "speech" : "text",
            charIndex: getFieldText({
              blockIndex: prevIdx,
              field: prevBlock?.type === "serif" ? "speech" : "text",
              charIndex: 0,
            }).length,
          });
        }
        return;
      }

      // 矢印キー
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const text = getFieldText(cursor);
        if (charIndex < text.length) {
          setCursor({ ...cursor, charIndex: charIndex + 1 });
        }
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (charIndex > 0) {
          setCursor({ ...cursor, charIndex: charIndex - 1 });
        }
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        // 次のブロックへ
        if (blockIndex < doc.blocks.length - 1) {
          const nextBlock = doc.blocks[blockIndex + 1];
          setCursor({
            blockIndex: blockIndex + 1,
            field: nextBlock.type === "serif" ? "speaker" : "text",
            charIndex: 0,
          });
        }
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        // 前のブロックへ
        if (blockIndex > 0) {
          const prevBlock = doc.blocks[blockIndex - 1];
          setCursor({
            blockIndex: blockIndex - 1,
            field: prevBlock.type === "serif" ? "speaker" : "text",
            charIndex: 0,
          });
        }
        return;
      }
    },
    [cursor, doc, getFieldText, updateDoc, pushHistory]
  );

  // テキスト入力（IME対応）
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      const input = e.currentTarget;
      const value = input.value;
      if (!value) return;
      input.value = "";
      pushHistory();

      const { blockIndex, field, charIndex } = cursor;
      const text = getFieldText(cursor);
      const newText =
        text.slice(0, charIndex) + value + text.slice(charIndex);

      updateDoc((d) => {
        const newBlocks = [...d.blocks];
        const b = { ...newBlocks[blockIndex] };
        if (b.type === "serif") {
          if (field === "speaker") b.speaker = newText;
          else b.speech = newText;
        } else {
          (b as any).text = newText;
        }
        newBlocks[blockIndex] = b as Block;
        return { blocks: newBlocks };
      });
      setCursor({ ...cursor, charIndex: charIndex + value.length });
    },
    [cursor, getFieldText, updateDoc, pushHistory]
  );

  const statusLabels: Record<SaveStatus, string> = {
    idle: "",
    saving: "保存中...",
    saved: "保存済み",
    error: "保存エラー",
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ツールバー */}
      <div className="flex items-center gap-1 bg-white border-b border-gray-200 px-3 py-1 shrink-0">
        <ToolBtn
          label="セリフ"
          shortcut="Enter"
          onClick={() => insertBlock({ type: "serif", speaker: "", speech: "" })}
        />
        <ToolBtn
          label="ト書き"
          onClick={() => insertBlock({ type: "togaki", text: "" })}
        />
        <ToolBtn
          label="場面"
          onClick={() => insertBlock({ type: "sceneHeading", text: "" })}
        />

        <div className="mx-2 h-4 w-px bg-gray-200" />

        <ToolBtn label="元に戻す" shortcut="⌘Z" onClick={undo} />

        <div className="flex-1" />

        <span className="text-xs text-gray-400">
          {doc.blocks.length}ブロック
        </span>
        {saveStatus !== "idle" && (
          <span
            className={`text-xs ml-3 ${
              saveStatus === "error" ? "text-red-500" : "text-gray-400"
            }`}
          >
            {statusLabels[saveStatus]}
          </span>
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1">
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="absolute inset-0 cursor-text"
          style={{ width: "100%", height: "100%" }}
        />
        <textarea
          ref={inputRef}
          onKeyDown={(e) => {
            // Cmd+Z でundo
            if ((e.metaKey || e.ctrlKey) && e.key === "z") {
              e.preventDefault();
              undo();
              return;
            }
            handleKeyDown(e);
          }}
          onInput={handleInput}
          className="absolute opacity-0 w-0 h-0"
          style={{ top: 0, left: 0 }}
          autoFocus
        />
      </div>
    </div>
  );
}

function ToolBtn({
  label,
  shortcut,
  onClick,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {label}
      {shortcut && (
        <kbd className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded px-1">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
