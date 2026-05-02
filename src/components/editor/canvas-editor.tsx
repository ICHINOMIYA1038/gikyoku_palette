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

// ─── レイアウト定数（A4横向き台本形式） ───
const PAGE_W = 1060; // A4横 (px at ~96dpi scale)
const PAGE_H = 720;
const MARGIN = { top: 30, bottom: 30, left: 40, right: 40 };
const FONT_SIZE = 18;
const SPEAKER_FONT_SIZE = 15;
const CHAR_H = FONT_SIZE + 6; // 文字送りピッチ（縦方向）
const COL_W = FONT_SIZE + 12; // 列幅
const SPEAKER_AREA_H = SPEAKER_FONT_SIZE * 4 + 10; // 話者名エリア高さ
const SEP_Y = MARGIN.top + SPEAKER_AREA_H; // 区切り線Y
const BODY_TOP = SEP_Y + 8; // セリフ開始Y
const BODY_H = PAGE_H - MARGIN.bottom - BODY_TOP; // セリフエリア高さ
const MAX_CHARS_PER_COL = Math.floor(BODY_H / CHAR_H); // 1列あたり最大文字数

const BODY_FONT = `${FONT_SIZE}px "Noto Serif JP", "游明朝", serif`;
const SPEAKER_FONT = `bold ${SPEAKER_FONT_SIZE}px "Noto Serif JP", "游明朝", serif`;

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

function computeColumns(doc: PlayDocument): ColLayout[] {
  const cols: ColLayout[] = [];
  let x = PAGE_W - MARGIN.right - COL_W / 2; // 右端から開始

  for (let bi = 0; bi < doc.blocks.length; bi++) {
    const block = doc.blocks[bi];

    if (block.type === "serif") {
      // セリフのテキストを列に分割
      const speech = block.speech || "";
      if (speech.length === 0) {
        // 空でも1列確保
        cols.push({
          blockIndex: bi,
          field: "speech",
          x,
          chars: "",
          startCharIndex: 0,
        });
        x -= COL_W;
      } else {
        for (let i = 0; i < speech.length; i += MAX_CHARS_PER_COL) {
          cols.push({
            blockIndex: bi,
            field: "speech",
            x,
            chars: speech.slice(i, i + MAX_CHARS_PER_COL),
            startCharIndex: i,
          });
          x -= COL_W;
        }
      }
    } else {
      const text = (block as any).text || "";
      if (text.length === 0) {
        cols.push({
          blockIndex: bi,
          field: "text",
          x,
          chars: "",
          startCharIndex: 0,
        });
        x -= COL_W;
      } else {
        for (let i = 0; i < text.length; i += MAX_CHARS_PER_COL) {
          cols.push({
            blockIndex: bi,
            field: "text",
            x,
            chars: text.slice(i, i + MAX_CHARS_PER_COL),
            startCharIndex: i,
          });
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
  cursor: CursorPosition | null
) {
  ctx.clearRect(0, 0, PAGE_W, PAGE_H);

  // 背景
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // 区切り線
  ctx.strokeStyle = "#999";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN.left, SEP_Y);
  ctx.lineTo(PAGE_W - MARGIN.right, SEP_Y);
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
          MARGIN.top + i * (SPEAKER_FONT_SIZE + 3)
        );
      }

      // 話者名カーソル
      if (
        cursor &&
        cursor.blockIndex === col.blockIndex &&
        cursor.field === "speaker"
      ) {
        const cy =
          MARGIN.top + cursor.charIndex * (SPEAKER_FONT_SIZE + 3);
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
      ctx.fillText(
        ch,
        col.x - FONT_SIZE / 2 + offsetX,
        BODY_TOP + i * CHAR_H
      );
    }

    // セリフカーソル
    if (
      cursor &&
      cursor.blockIndex === col.blockIndex &&
      (cursor.field === "speech" || cursor.field === "text")
    ) {
      const localIndex = cursor.charIndex - col.startCharIndex;
      if (
        localIndex >= 0 &&
        localIndex <= col.chars.length &&
        (localIndex < MAX_CHARS_PER_COL || col.chars.length < MAX_CHARS_PER_COL)
      ) {
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
  const [scale, setScale] = useState(1);

  const colsRef = useRef<ColLayout[]>([]);

  // 描画
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const cols = computeColumns(doc);
    colsRef.current = cols;
    console.log("[CanvasEditor] redraw", { blocks: doc.blocks.length, cols: cols.length, cursor });
    if (cols.length > 0) {
      console.log("[CanvasEditor] first col", cols[0]);
    }
    draw(ctx, doc, cols, cursor);
  }, [doc, cursor]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    document.fonts.ready.then(() => redraw());
  }, [redraw]);

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
      const mx = (e.clientX - rect.left) * (PAGE_W / rect.width);
      const my = (e.clientY - rect.top) * (PAGE_H / rect.height);

      // 話者名エリアのクリック
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
    [doc]
  );

  // キーボード入力
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const { blockIndex, field, charIndex } = cursor;
      const block = doc.blocks[blockIndex];
      if (!block) return;

      if (e.key === "Enter") {
        e.preventDefault();
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
    [cursor, doc, getFieldText, updateDoc]
  );

  // テキスト入力（IME対応）
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      const input = e.currentTarget;
      const value = input.value;
      if (!value) return;
      input.value = "";

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
    [cursor, getFieldText, updateDoc]
  );

  const statusLabels: Record<SaveStatus, string> = {
    idle: "",
    saving: "保存中...",
    saved: "保存済み",
    error: "保存エラー",
  };

  // コンテナ幅に合わせてCanvasをスケーリング
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const availableW = entry.contentRect.width - 32; // padding分
        const s = Math.min(1, availableW / PAGE_W);
        setScale(s);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col items-center h-full bg-gray-100 overflow-auto p-4">
      <div className="mb-2 flex items-center gap-4 text-xs text-gray-500">
        <span>台本エディタ（A4横・縦書き）</span>
        {saveStatus !== "idle" && (
          <span className={saveStatus === "error" ? "text-red-500" : ""}>
            {statusLabels[saveStatus]}
          </span>
        )}
      </div>
      <div
        className="relative shadow-lg origin-top"
        style={{
          width: PAGE_W,
          height: PAGE_H,
          transform: `scale(${scale})`,
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="cursor-text border border-gray-300 bg-white"
          style={{ width: PAGE_W, height: PAGE_H }}
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
