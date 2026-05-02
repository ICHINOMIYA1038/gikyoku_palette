/**
 * 横書きモードのCanvas描画エンジン。
 */
import {
  type PlayDocument,
  type CursorPosition,
  type TypesettingConfig,
  DEFAULT_TYPESETTING,
} from "./play-document";

const PT2PX = 96 / 72;

function fontStr(size: number, cfg: TypesettingConfig, bold = false) {
  const family = cfg.fontFamily === "gothic"
    ? '"Noto Sans JP", "游ゴシック", sans-serif'
    : '"Noto Serif JP", "游明朝", serif';
  return `${bold ? "bold " : ""}${size}px ${family}`;
}

const H_ROW_H = 44;
const H_MARGIN = { top: 24, left: 30, right: 30 };
const H_SPEAKER_W = 130;
const H_SEP_X_OFFSET = H_SPEAKER_W + 10;

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
  const bodyFont = fontStr(fontSize, cfg);
  const speakerFont = fontStr(speakerFontSize, cfg, true);

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

    // 行区切り
    if (bi < doc.blocks.length - 1) {
      ctx.strokeStyle = "#eee";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(contentLeft, y + H_ROW_H);
      ctx.lineTo(w - H_MARGIN.right, y + H_ROW_H);
      ctx.stroke();
    }

    if (block.type === "title") {
      ctx.font = fontStr(fontSize * 1.3, cfg, true);
      ctx.fillStyle = "#111";
      ctx.fillText(block.title || "", contentLeft, cy);
      ctx.font = fontStr(fontSize * 0.8, cfg);
      ctx.fillStyle = "#555";
      const titleW = ctx.measureText(block.title || "").width;
      ctx.fillText(block.author || "", contentLeft + titleW + 20, cy);

      if (cursor && cursor.blockIndex === bi) {
        ctx.fillStyle = "#1a73e8";
        if (cursor.field === "title") {
          ctx.font = fontStr(fontSize * 1.3, cfg, true);
          const tx = contentLeft + ctx.measureText((block.title || "").slice(0, cursor.charIndex)).width;
          ctx.fillRect(tx, y + 6, 2, H_ROW_H - 12);
        } else if (cursor.field === "author") {
          ctx.font = fontStr(fontSize * 0.8, cfg);
          const tx = contentLeft + ctx.measureText(block.title || "").width + 20 +
            ctx.measureText((block.author || "").slice(0, cursor.charIndex)).width;
          ctx.fillRect(tx, y + 6, 2, H_ROW_H - 12);
        }
      }
    } else if (block.type === "castList") {
      ctx.font = fontStr(speakerFontSize, cfg, true);
      ctx.fillStyle = "#888";
      ctx.fillText("登場人物: ", contentLeft, cy);
      ctx.font = fontStr(speakerFontSize, cfg);
      const labelW = ctx.measureText("登場人物: ").width;
      const names = block.characters.map((c) => c.name).join("　");
      ctx.fillText(names, contentLeft + labelW, cy);
    } else if (block.type === "setting") {
      ctx.font = fontStr(fontSize * 0.9, cfg);
      ctx.fillStyle = "#555";
      ctx.fillText(block.text || "", contentLeft, cy);
      if (cursor && cursor.blockIndex === bi && cursor.field === "text") {
        const tx = contentLeft + ctx.measureText((block.text || "").slice(0, cursor.charIndex)).width;
        ctx.fillStyle = "#1a73e8";
        ctx.fillRect(tx, y + 6, 2, H_ROW_H - 12);
      }
    } else if (block.type === "sceneHeading") {
      ctx.font = fontStr(fontSize, cfg, true);
      ctx.fillStyle = "#111";
      ctx.fillText(block.text || "", contentLeft, cy);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(contentLeft, y + H_ROW_H - 2);
      ctx.lineTo(w - H_MARGIN.right, y + H_ROW_H - 2);
      ctx.stroke();
      if (cursor && cursor.blockIndex === bi && cursor.field === "text") {
        const tx = contentLeft + ctx.measureText((block.text || "").slice(0, cursor.charIndex)).width;
        ctx.fillStyle = "#1a73e8";
        ctx.fillRect(tx, y + 6, 2, H_ROW_H - 12);
      }
    } else if (block.type === "serif") {
      // 話者名
      ctx.font = speakerFont;
      ctx.fillStyle = "#111";
      ctx.fillText(block.speaker || "", contentLeft, cy);
      // 感情指示
      if (block.direction) {
        ctx.font = fontStr(speakerFontSize * 0.85, cfg);
        ctx.fillStyle = "#888";
        const spW = ctx.measureText(block.speaker || "").width;
        ctx.fillText(`（${block.direction}）`, contentLeft + spW + 6, cy);
      }
      // 区切り線
      ctx.strokeStyle = "#d0d0d0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sepX, y + 6);
      ctx.lineTo(sepX, y + H_ROW_H - 6);
      ctx.stroke();
      // セリフ
      ctx.font = bodyFont;
      ctx.fillStyle = "#1a1a1a";
      ctx.fillText(block.speech || "", speechLeft, cy);

      if (cursor && cursor.blockIndex === bi) {
        ctx.fillStyle = "#1a73e8";
        if (cursor.field === "speaker") {
          ctx.font = speakerFont;
          const tx = contentLeft + ctx.measureText((block.speaker || "").slice(0, cursor.charIndex)).width;
          ctx.fillRect(tx, y + 6, 2, H_ROW_H - 12);
        } else if (cursor.field === "speech") {
          ctx.font = bodyFont;
          const tx = speechLeft + ctx.measureText((block.speech || "").slice(0, cursor.charIndex)).width;
          ctx.fillRect(tx, y + 6, 2, H_ROW_H - 12);
        }
      }
    } else if (block.type === "togaki") {
      ctx.font = fontStr(fontSize * 0.9, cfg);
      ctx.fillStyle = "#666";
      ctx.fillText(`　${block.text || ""}`, speechLeft, cy);
      if (cursor && cursor.blockIndex === bi && cursor.field === "text") {
        const tx = speechLeft + ctx.measureText(`　${(block.text || "").slice(0, cursor.charIndex)}`).width;
        ctx.fillStyle = "#1a73e8";
        ctx.fillRect(tx, y + 6, 2, H_ROW_H - 12);
      }
    } else if (block.type === "endMark") {
      ctx.font = fontStr(fontSize, cfg);
      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.fillText(block.text || "おわり", w / 2, cy);
      ctx.textAlign = "left";
    }
  }
}

export function hitTestHorizontal(
  doc: PlayDocument,
  mx: number,
  my: number
): CursorPosition | null {
  const contentLeft = H_MARGIN.left;
  const sepX = contentLeft + H_SEP_X_OFFSET;

  const bi = Math.floor((my - H_MARGIN.top) / H_ROW_H);
  if (bi < 0 || bi >= doc.blocks.length) return null;

  const block = doc.blocks[bi];

  switch (block.type) {
    case "title":
      return { blockIndex: bi, field: mx < 300 ? "title" : "author", charIndex: mx < 300 ? block.title.length : block.author.length };
    case "serif":
      if (mx < sepX) return { blockIndex: bi, field: "speaker", charIndex: block.speaker.length };
      return { blockIndex: bi, field: "speech", charIndex: block.speech.length };
    case "castList":
      return null; // castListは特殊UI（後で対応）
    default:
      return { blockIndex: bi, field: "text", charIndex: ((block as any).text || "").length };
  }
}
