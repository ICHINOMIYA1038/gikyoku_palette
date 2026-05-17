/**
 * 横書きモードのCanvas描画エンジン。
 * ブロック種別ごとに異なる行高・スタイルで描画。
 * アクティブ行ハイライト付き。
 */
import {
  type PlayDocument,
  type CursorPosition,
  type TypesettingConfig,
  DEFAULT_TYPESETTING,
} from "./play-document";

const PT2PX = 96 / 72;

import type { CursorRect } from "./draw-script";

/** テキスト+IME未確定文字を、カーソル位置に挿入する形で描画。後続文字は押し下げ。下線あり。 */
function drawTextWithComposing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  active: boolean,
  fieldMatch: boolean,
  cursorIdx: number,
  composing: string,
  underlineY: number,
): number {
  if (!active || !fieldMatch || !composing) {
    ctx.fillText(text, x, y);
    return x + ctx.measureText(text.slice(0, cursorIdx)).width + (active && fieldMatch ? 0 : 0);
  }
  const pre = text.slice(0, cursorIdx);
  const post = text.slice(cursorIdx);
  const preW = ctx.measureText(pre).width;
  const compW = ctx.measureText(composing).width;
  ctx.fillText(pre, x, y);
  const savedFill = ctx.fillStyle;
  ctx.fillText(composing, x + preW, y);
  ctx.fillRect(x + preW, underlineY, compW, 1);
  ctx.fillStyle = savedFill;
  ctx.fillText(post, x + preW + compW, y);
  return x + preW + compW;
}

/** カーソル描画（縦線タイプ、横書き用） */
function drawCursorVert(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, out?: { rect: CursorRect | null }) {
  if (out) out.rect = { x: x - 4, y: y - 4, w: 16, h: height + 8 };
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(x, y, 3, height);
  // 上下に小さな三角形
  ctx.beginPath();
  ctx.moveTo(x + 1.5, y);
  ctx.lineTo(x - 2, y - 3);
  ctx.lineTo(x + 5, y - 3);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 1.5, y + height);
  ctx.lineTo(x - 2, y + height + 3);
  ctx.lineTo(x + 5, y + height + 3);
  ctx.fill();
}

function fontStr(size: number, cfg: TypesettingConfig, bold = false, italic = false) {
  const family = cfg.fontFamily === "gothic"
    ? '"Noto Sans JP", "游ゴシック", sans-serif'
    : '"Noto Serif JP", "游明朝", serif';
  return `${italic ? "italic " : ""}${bold ? "bold " : ""}${size}px ${family}`;
}

// ブロック種別ごとの行高
const ROW_HEIGHTS: Record<string, number> = {
  title: 56,
  castList: 40,
  sceneHeading: 48,
  serif: 42,
  togaki: 38,
  endMark: 48,
};

const H_DRAG_HANDLE_W = 20; // ドラッグハンドル幅
const H_MARGIN = { top: 20, left: 40, right: 40 };

export { ROW_HEIGHTS, H_MARGIN, H_DRAG_HANDLE_W, computeRowPositions };
const H_SPEAKER_W = 140; // 長い話者名（ナレーション等）対応
const H_SEP_X = H_MARGIN.left + H_SPEAKER_W + 12;
const H_SPEECH_LEFT = H_SEP_X + 14;

/** 各ブロックのY位置を計算 */
function computeRowPositions(doc: PlayDocument): number[] {
  const positions: number[] = [];
  let y = H_MARGIN.top;
  for (const block of doc.blocks) {
    positions.push(y);
    y += ROW_HEIGHTS[block.type] || 42;
  }
  return positions;
}

import type { SelectionRange } from "./draw-script";

export type BlockDragState = {
  draggingIndex: number;
  mouseY: number;
} | null;

export function drawHorizontal(
  ctx: CanvasRenderingContext2D,
  doc: PlayDocument,
  cursor: CursorPosition | null,
  w: number,
  h: number,
  selection: SelectionRange = null,
  blockDrag: BlockDragState = null,
  composingText: string = "",
  cursorOut?: { rect: CursorRect | null }
) {
  if (cursorOut) cursorOut.rect = null;
  const _cur = cursorOut;
  const cfg = doc.typesetting || DEFAULT_TYPESETTING;
  const fontSize = cfg.fontSize * PT2PX;
  const speakerFontSize = cfg.speakerFontSize * PT2PX;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fafaf9";
  ctx.fillRect(0, 0, w, h);

  const rowY = computeRowPositions(doc);

  for (let bi = 0; bi < doc.blocks.length; bi++) {
    const block = doc.blocks[bi];
    const y = rowY[bi];
    const rowH = ROW_HEIGHTS[block.type] || 42;
    const cy = y + rowH / 2;
    const isActive = cursor?.blockIndex === bi;

    // アクティブ行ハイライト
    if (isActive) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, y, w, rowH);
      // 左端のアクセントライン
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(0, y, 3, rowH);
    } else {
      ctx.fillStyle = "#fafaf9";
      ctx.fillRect(0, y, w, rowH);
    }

    ctx.textBaseline = "middle";

    switch (block.type) {
      case "title": {
        const titleActive = isActive && cursor?.field === "title";
        const authorActive = isActive && cursor?.field === "author";
        // タイトル
        ctx.font = fontStr(fontSize * 1.5, cfg, true);
        if (!block.title && isActive && !composingText) { ctx.fillStyle = "#ccc"; ctx.fillText("タイトル", H_MARGIN.left, cy - 2); }
        ctx.fillStyle = "#111";
        const titleEndX = drawTextWithComposing(ctx, block.title || "", H_MARGIN.left, cy - 2, isActive, !!titleActive, cursor?.charIndex || 0, titleActive ? composingText : "", y + rowH - 4);
        // 作者名
        ctx.font = fontStr(fontSize * 0.75, cfg);
        const titleW = ctx.measureText(block.title || "").width + (titleActive && composingText ? ctx.measureText(composingText).width : 0);
        if (!block.author && isActive && !authorActive && !composingText) { ctx.fillStyle = "#ccc"; ctx.fillText("作者名", H_MARGIN.left + (titleW || 80) + 24, cy + 2); }
        ctx.fillStyle = "#666";
        const authorEndX = drawTextWithComposing(ctx, block.author || "", H_MARGIN.left + titleW + 24, cy + 2, isActive, !!authorActive, cursor?.charIndex || 0, authorActive ? composingText : "", y + rowH - 4);

        // 下線
        ctx.strokeStyle = "#d0d0d0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(H_MARGIN.left, y + rowH - 1);
        ctx.lineTo(w - H_MARGIN.right, y + rowH - 1);
        ctx.stroke();

        if (titleActive) {
          drawCursorVert(ctx, titleEndX, y + 8, rowH - 16, _cur);
        } else if (authorActive) {
          drawCursorVert(ctx, authorEndX, y + 8, rowH - 16, _cur);
        }
        break;
      }

      case "castList": {
        ctx.font = fontStr(speakerFontSize * 0.9, cfg);
        ctx.fillStyle = "#999";
        ctx.fillText("登場人物", H_MARGIN.left, cy);
        ctx.fillStyle = "#555";
        const names = block.characters.map((c) => c.name).join("　　");
        ctx.fillText(names, H_MARGIN.left + 80, cy);

        ctx.strokeStyle = "#e5e5e5";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(H_MARGIN.left, y + rowH - 1);
        ctx.lineTo(w - H_MARGIN.right, y + rowH - 1);
        ctx.stroke();
        break;
      }

      case "sceneHeading": {
        const textActive = isActive && cursor?.field === "text";
        if (!isActive) {
          ctx.fillStyle = "#f0f0ed";
          ctx.fillRect(0, y, w, rowH);
        }
        ctx.font = fontStr(fontSize * 1.1, cfg, true);
        if (!block.text && isActive && !composingText) { ctx.fillStyle = "#ccc"; ctx.fillText("場面", H_MARGIN.left, cy); }
        ctx.fillStyle = "#111";
        const endX = drawTextWithComposing(ctx, block.text || "", H_MARGIN.left, cy, isActive, !!textActive, cursor?.charIndex || 0, textActive ? composingText : "", y + rowH - 4);
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(H_MARGIN.left, y + rowH - 1);
        ctx.lineTo(w - H_MARGIN.right, y + rowH - 1);
        ctx.stroke();
        if (textActive) drawCursorVert(ctx, endX, y + 8, rowH - 16, _cur);
        break;
      }

      case "serif": {
        // 話者名
        ctx.font = fontStr(speakerFontSize, cfg, true);
        if (!block.speaker && isActive) {
          ctx.fillStyle = "#ccc";
          ctx.fillText("名前", H_MARGIN.left, cy);
        }
        ctx.fillStyle = "#333";
        {
          const spkText = block.speaker || "";
          const spkComposing = isActive && cursor?.field === "speaker" && composingText.length > 0;
          if (spkComposing) {
            const pre = spkText.slice(0, cursor!.charIndex);
            const post = spkText.slice(cursor!.charIndex);
            ctx.fillText(pre, H_MARGIN.left, cy);
            const preW = ctx.measureText(pre).width;
            const compW = ctx.measureText(composingText).width;
            ctx.fillText(post, H_MARGIN.left + preW + compW, cy);
          } else {
            ctx.fillText(spkText, H_MARGIN.left, cy);
          }
        }
        // 感情指示
        if (block.direction) {
          ctx.font = fontStr(speakerFontSize * 0.8, cfg);
          ctx.fillStyle = "#999";
          const spW = ctx.measureText(block.speaker || "").width;
          ctx.fillText(`（${block.direction}）`, H_MARGIN.left + spW + 4, cy);
        }
        // 区切り線
        ctx.strokeStyle = "#ccc";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(H_SEP_X, y + 8);
        ctx.lineTo(H_SEP_X, y + rowH - 8);
        ctx.stroke();
        // セリフ - 選択ハイライト
        ctx.font = fontStr(fontSize, cfg);
        if (selection && selection.blockIndex === bi && selection.field === "speech") {
          const hlStart = ctx.measureText((block.speech || "").slice(0, selection.start)).width;
          const hlEnd = ctx.measureText((block.speech || "").slice(0, selection.end)).width;
          ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
          ctx.fillRect(H_SPEECH_LEFT + hlStart, y + 4, hlEnd - hlStart, rowH - 8);
        }
        // セリフテキスト（IME未確定がある場合はカーソル位置で分割）
        if (!block.speech && isActive) {
          ctx.fillStyle = "#ccc";
          ctx.fillText("セリフ", H_SPEECH_LEFT, cy);
        }
        ctx.fillStyle = "#1a1a1a";
        const speechText = block.speech || "";
        const speechComposing = isActive && cursor?.field === "speech" && composingText.length > 0;
        if (speechComposing) {
          const pre = speechText.slice(0, cursor!.charIndex);
          const post = speechText.slice(cursor!.charIndex);
          ctx.fillText(pre, H_SPEECH_LEFT, cy);
          const preW = ctx.measureText(pre).width;
          const compW = ctx.measureText(composingText).width;
          ctx.fillText(post, H_SPEECH_LEFT + preW + compW, cy);
        } else {
          ctx.fillText(speechText, H_SPEECH_LEFT, cy);
        }
        // 行の下区切り
        ctx.strokeStyle = "#eeeeec";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(H_MARGIN.left, y + rowH - 1);
        ctx.lineTo(w - H_MARGIN.right, y + rowH - 1);
        ctx.stroke();

        if (isActive && cursor) {
          if (cursor.field === "speaker") {
            ctx.font = fontStr(speakerFontSize, cfg, true);
            const cx = H_MARGIN.left + ctx.measureText((block.speaker || "").slice(0, cursor.charIndex)).width;
            if (composingText) {
              ctx.fillStyle = "#333";
              ctx.fillText(composingText, cx, cy);
              const compW = ctx.measureText(composingText).width;
              ctx.fillRect(cx, y + rowH - 10, compW, 1); // 下線
            }
            drawCursorVert(ctx, cx + (composingText ? ctx.measureText(composingText).width : 0), y + 8, rowH - 16, _cur);
          } else if (cursor.field === "speech") {
            ctx.font = fontStr(fontSize, cfg);
            const cx = H_SPEECH_LEFT + ctx.measureText((block.speech || "").slice(0, cursor.charIndex)).width;
            if (composingText) {
              ctx.fillStyle = "#1a1a1a";
              ctx.fillText(composingText, cx, cy);
              const compW = ctx.measureText(composingText).width;
              ctx.fillRect(cx, y + rowH - 8, compW, 1); // 下線
            }
            drawCursorVert(ctx, cx + (composingText ? ctx.measureText(composingText).width : 0), y + 8, rowH - 16, _cur);
          }
        }
        break;
      }

      case "togaki": {
        const textActive = isActive && cursor?.field === "text";
        if (!isActive) {
          ctx.fillStyle = "#f8f8f5";
          ctx.fillRect(0, y, w, rowH);
        }
        ctx.font = fontStr(speakerFontSize * 0.75, cfg);
        ctx.fillStyle = "#bbb";
        ctx.fillText("ト書き", H_MARGIN.left, cy);
        ctx.font = fontStr(fontSize * 0.9, cfg, false, true);
        if (!block.text && isActive && !composingText) { ctx.fillStyle = "#ccc"; ctx.fillText("ト書き", H_SPEECH_LEFT, cy); }
        ctx.fillStyle = "#666";
        const endX = drawTextWithComposing(ctx, block.text || "", H_SPEECH_LEFT, cy, isActive, !!textActive, cursor?.charIndex || 0, textActive ? composingText : "", y + rowH - 4);
        ctx.strokeStyle = "#e8e8e5";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(H_MARGIN.left, y + rowH - 1);
        ctx.lineTo(w - H_MARGIN.right, y + rowH - 1);
        ctx.stroke();
        if (textActive) drawCursorVert(ctx, endX, y + 6, rowH - 12, _cur);
        break;
      }

      case "endMark": {
        ctx.font = fontStr(fontSize, cfg);
        ctx.fillStyle = "#555";
        ctx.textAlign = "center";
        ctx.fillText(block.text || "おわり", w / 2, cy);
        ctx.textAlign = "left";
        break;
      }
    }

    // ドラッグハンドル（左端の⠿アイコン）
    ctx.fillStyle = "#ccc";
    const hx = 8;
    const hy = cy;
    for (let r = -1; r <= 1; r++) {
      for (let c = 0; c < 2; c++) {
        ctx.beginPath();
        ctx.arc(hx + c * 5, hy + r * 5, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ─── ドラッグ中のインジケーター ───
  if (blockDrag) {
    // ドロップ先の線を描画
    const dropIndex = findDropIndex(doc, blockDrag.mouseY);
    const dropY = dropIndex < rowY.length ? rowY[dropIndex] : (rowY.length > 0 ? rowY[rowY.length - 1] + (ROW_HEIGHTS[doc.blocks[doc.blocks.length - 1]?.type] || 42) : H_MARGIN.top);
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(H_MARGIN.left, dropY);
    ctx.lineTo(w - H_MARGIN.right, dropY);
    ctx.stroke();
    // ドラッグ中のブロックを半透明で表示
    ctx.globalAlpha = 0.3;
    const dragBlock = doc.blocks[blockDrag.draggingIndex];
    if (dragBlock) {
      const dragH = ROW_HEIGHTS[dragBlock.type] || 42;
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(0, blockDrag.mouseY - dragH / 2, w, dragH);
    }
    ctx.globalAlpha = 1;
  }
}

/** ドロップ先のインデックスを計算 */
export function findDropIndex(doc: PlayDocument, mouseY: number): number {
  const rowY = computeRowPositions(doc);
  for (let i = 0; i < rowY.length; i++) {
    const rowH = ROW_HEIGHTS[doc.blocks[i]?.type] || 42;
    if (mouseY < rowY[i] + rowH / 2) return i;
  }
  return doc.blocks.length;
}

export function hitTestHorizontal(
  doc: PlayDocument,
  mx: number,
  my: number
): CursorPosition | null {
  const rowY = computeRowPositions(doc);

  for (let bi = 0; bi < doc.blocks.length; bi++) {
    const block = doc.blocks[bi];
    const y = rowY[bi];
    const rowH = ROW_HEIGHTS[block.type] || 42;

    if (my >= y && my < y + rowH) {
      switch (block.type) {
        case "title": {
          // タイトル幅を動的に計算
          const titleEnd = H_MARGIN.left + (block.title || "").length * 24 + 24;
          const isTitle = mx < titleEnd;
          return { blockIndex: bi, field: isTitle ? "title" : "author", charIndex: isTitle ? block.title.length : block.author.length };
        }
        case "serif":
          // speakerが空なら、どこをクリックしてもspeakerに移動
          if (!block.speaker) return { blockIndex: bi, field: "speaker", charIndex: 0 };
          if (mx < H_SEP_X) return { blockIndex: bi, field: "speaker", charIndex: block.speaker.length };
          return { blockIndex: bi, field: "speech", charIndex: block.speech.length };
        case "castList":
          return null;
        default:
          return { blockIndex: bi, field: "text", charIndex: ((block as any).text || "").length };
      }
    }
  }
  return null;
}
