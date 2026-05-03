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

/** カーソル描画（縦線タイプ、横書き用） */
function drawCursorVert(ctx: CanvasRenderingContext2D, x: number, y: number, height: number) {
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
  setting: 36,
  sceneHeading: 48,
  serif: 42,
  togaki: 38,
  endMark: 48,
};

const H_MARGIN = { top: 20, left: 40, right: 40 };
const H_SPEAKER_W = 100;
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

export function drawHorizontal(
  ctx: CanvasRenderingContext2D,
  doc: PlayDocument,
  cursor: CursorPosition | null,
  w: number,
  h: number
) {
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
        // タイトル（大きめ太字）
        ctx.font = fontStr(fontSize * 1.5, cfg, true);
        ctx.fillStyle = "#111";
        ctx.fillText(block.title || "", H_MARGIN.left, cy - 2);
        // 作者名
        ctx.font = fontStr(fontSize * 0.75, cfg);
        ctx.fillStyle = "#666";
        const titleW = ctx.measureText(block.title || "").width;
        ctx.fillText(block.author || "", H_MARGIN.left + titleW + 24, cy + 2);

        // 下線
        ctx.strokeStyle = "#d0d0d0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(H_MARGIN.left, y + rowH - 1);
        ctx.lineTo(w - H_MARGIN.right, y + rowH - 1);
        ctx.stroke();

        if (isActive && cursor) {
          if (cursor.field === "title") {
            ctx.font = fontStr(fontSize * 1.5, cfg, true);
            const cx = H_MARGIN.left + ctx.measureText((block.title || "").slice(0, cursor.charIndex)).width;
            drawCursorVert(ctx, cx, y + 8, rowH - 16);
          } else if (cursor.field === "author") {
            ctx.font = fontStr(fontSize * 1.5, cfg, true);
            const tw = ctx.measureText(block.title || "").width;
            ctx.font = fontStr(fontSize * 0.75, cfg);
            const cx = H_MARGIN.left + tw + 24 + ctx.measureText((block.author || "").slice(0, cursor.charIndex)).width;
            drawCursorVert(ctx, cx, y + 8, rowH - 16);
          }
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

      case "setting": {
        // 背景を少し色付け
        if (!isActive) {
          ctx.fillStyle = "#f5f5f0";
          ctx.fillRect(0, y, w, rowH);
        }
        ctx.font = fontStr(fontSize * 0.85, cfg, false, true);
        ctx.fillStyle = "#777";
        ctx.fillText(block.text || "", H_MARGIN.left + 12, cy);

        if (isActive && cursor?.field === "text") {
          ctx.font = fontStr(fontSize * 0.85, cfg, false, true);
          const cx = H_MARGIN.left + 12 + ctx.measureText((block.text || "").slice(0, cursor.charIndex)).width;
          drawCursorVert(ctx, cx, y + 6, rowH - 12);
        }
        break;
      }

      case "sceneHeading": {
        // 背景
        if (!isActive) {
          ctx.fillStyle = "#f0f0ed";
          ctx.fillRect(0, y, w, rowH);
        }
        ctx.font = fontStr(fontSize * 1.1, cfg, true);
        ctx.fillStyle = "#111";
        ctx.fillText(block.text || "", H_MARGIN.left, cy);
        // 太い下線
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(H_MARGIN.left, y + rowH - 1);
        ctx.lineTo(w - H_MARGIN.right, y + rowH - 1);
        ctx.stroke();

        if (isActive && cursor?.field === "text") {
          ctx.font = fontStr(fontSize * 1.1, cfg, true);
          const cx = H_MARGIN.left + ctx.measureText((block.text || "").slice(0, cursor.charIndex)).width;
          drawCursorVert(ctx, cx, y + 8, rowH - 16);
        }
        break;
      }

      case "serif": {
        // 話者名
        ctx.font = fontStr(speakerFontSize, cfg, true);
        ctx.fillStyle = "#333";
        ctx.fillText(block.speaker || "", H_MARGIN.left, cy);
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
        // セリフ
        ctx.font = fontStr(fontSize, cfg);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillText(block.speech || "", H_SPEECH_LEFT, cy);
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
            drawCursorVert(ctx, cx, y + 8, rowH - 16);
          } else if (cursor.field === "speech") {
            ctx.font = fontStr(fontSize, cfg);
            const cx = H_SPEECH_LEFT + ctx.measureText((block.speech || "").slice(0, cursor.charIndex)).width;
            drawCursorVert(ctx, cx, y + 8, rowH - 16);
          }
        }
        break;
      }

      case "togaki": {
        // 背景を薄く色付け
        if (!isActive) {
          ctx.fillStyle = "#f8f8f5";
          ctx.fillRect(0, y, w, rowH);
        }
        // ラベル
        ctx.font = fontStr(speakerFontSize * 0.75, cfg);
        ctx.fillStyle = "#bbb";
        ctx.fillText("ト書き", H_MARGIN.left, cy);
        // テキスト
        ctx.font = fontStr(fontSize * 0.9, cfg, false, true);
        ctx.fillStyle = "#666";
        ctx.fillText(block.text || "", H_SPEECH_LEFT, cy);
        // 下線
        ctx.strokeStyle = "#e8e8e5";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(H_MARGIN.left, y + rowH - 1);
        ctx.lineTo(w - H_MARGIN.right, y + rowH - 1);
        ctx.stroke();

        if (isActive && cursor?.field === "text") {
          ctx.font = fontStr(fontSize * 0.9, cfg, false, true);
          const cx = H_SPEECH_LEFT + ctx.measureText((block.text || "").slice(0, cursor.charIndex)).width;
          drawCursorVert(ctx, cx, y + 6, rowH - 12);
        }
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
  }
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
