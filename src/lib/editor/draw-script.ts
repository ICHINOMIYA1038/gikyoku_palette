/**
 * 台本（縦書き）モードのCanvas描画エンジン。
 * B5横向き用紙ベースの固定レイアウト。
 *
 * 組版仕様:
 *   用紙: B5横 (257mm × 182mm)
 *   文字数: 20字/列
 *   列数: 20列/ページ
 *   フォント: 明朝体 12pt
 *   余白: 上30mm 下25mm 左20mm 右20mm
 *   話者名: 区切り線の上、最大5文字
 *   ぶら下げ: なし（全列同じ開始位置）
 */
import {
  type PlayDocument,
  type CursorPosition,
  type TypesettingConfig,
  DEFAULT_TYPESETTING,
} from "./play-document";

// ─── 用紙サイズ（B5横向き、px換算 @144dpi相当でシャープ描画） ───
const DPI = 144;
const MM = DPI / 25.4; // 1mm = 5.67px
const PAGE_W = Math.round(257 * MM); // 1457px
const PAGE_H = Math.round(182 * MM); // 1033px

// ─── 余白 ───
const M_TOP = Math.round(30 * MM);    // 170px
const M_BOTTOM = Math.round(25 * MM); // 142px
const M_LEFT = Math.round(20 * MM);   // 113px
const M_RIGHT = Math.round(20 * MM);  // 113px

// ─── テキスト設定 ───
const FONT_SIZE = Math.round(12 * DPI / 72); // 12pt = 24px
const SPEAKER_FONT_SIZE = Math.round(10 * DPI / 72); // 10pt = 20px
const COLS_PER_PAGE = 20;
const CHARS_PER_COL = 20;

// ─── 計算値 ───
const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT; // 本文エリア幅
const CONTENT_H = PAGE_H - M_TOP - M_BOTTOM; // 本文エリア高さ
const COL_W = Math.floor(CONTENT_W / COLS_PER_PAGE); // 列幅
const SPEAKER_AREA_H = Math.round(SPEAKER_FONT_SIZE * 3 + 8); // 話者名エリア高さ
const HEADER_H = 18;
const SEP_Y = M_TOP + HEADER_H + SPEAKER_AREA_H; // 区切り線Y
const BODY_TOP = SEP_Y + 6; // 本文開始Y
const BODY_H = PAGE_H - M_BOTTOM - BODY_TOP;
const CHAR_H = Math.floor(BODY_H / CHARS_PER_COL); // 1文字の送りピッチ

export { PAGE_W, PAGE_H };

function fontStr(size: number, cfg: TypesettingConfig, bold = false) {
  const family = cfg.fontFamily === "gothic"
    ? '"Noto Sans JP", "游ゴシック", sans-serif'
    : '"Noto Serif JP", "游明朝", serif';
  return `${bold ? "bold " : ""}${size}px ${family}`;
}

// ─── 列レイアウト ───
export type ColLayout = {
  blockIndex: number;
  field: "speaker" | "speech" | "text" | "direction" | "title" | "author";
  x: number;
  chars: string;
  startCharIndex: number;
  page: number;
  special?: "title" | "author" | "castLabel" | "castChar";
};

/** 列X座標（右端から数えて n 列目） */
function colX(colIndex: number): number {
  return PAGE_W - M_RIGHT - COL_W / 2 - colIndex * COL_W;
}

export function computeColumns(doc: PlayDocument): ColLayout[] {
  const cols: ColLayout[] = [];
  let ci = 0; // 列インデックス（0=右端）
  let page = 0;

  const nextCol = () => {
    ci++;
    if (ci >= COLS_PER_PAGE) {
      page++;
      ci = 0;
    }
  };

  for (let bi = 0; bi < doc.blocks.length; bi++) {
    const block = doc.blocks[bi];

    switch (block.type) {
      case "title":
        cols.push({ blockIndex: bi, field: "title", x: colX(ci), chars: block.title || "", startCharIndex: 0, page, special: "title" });
        nextCol();
        cols.push({ blockIndex: bi, field: "author", x: colX(ci), chars: block.author || "", startCharIndex: 0, page, special: "author" });
        nextCol();
        break;

      case "castList":
        cols.push({ blockIndex: bi, field: "text", x: colX(ci), chars: "登場人物", startCharIndex: 0, page, special: "castLabel" });
        nextCol();
        for (let k = 0; k < block.characters.length; k++) {
          cols.push({ blockIndex: bi, field: "text", x: colX(ci), chars: block.characters[k].name, startCharIndex: k, page, special: "castChar" });
          nextCol();
        }
        break;

      default: {
        const fieldName = block.type === "serif" ? "speech" : "text";
        const text = block.type === "serif" ? (block.speech || "") : ((block as any).text || "");
        if (text.length === 0) {
          cols.push({ blockIndex: bi, field: fieldName as any, x: colX(ci), chars: "", startCharIndex: 0, page });
          nextCol();
        } else {
          for (let i = 0; i < text.length; i += CHARS_PER_COL) {
            cols.push({ blockIndex: bi, field: fieldName as any, x: colX(ci), chars: text.slice(i, i + CHARS_PER_COL), startCharIndex: i, page });
            nextCol();
          }
        }
        break;
      }
    }
  }
  return cols;
}

// ─── 描画 ───
export function drawScript(
  ctx: CanvasRenderingContext2D,
  doc: PlayDocument,
  cols: ColLayout[],
  cursor: CursorPosition | null,
  currentPage: number
) {
  const cfg = doc.typesetting || DEFAULT_TYPESETTING;
  const bodyFont = fontStr(FONT_SIZE, cfg);
  const speakerFont = fontStr(SPEAKER_FONT_SIZE, cfg, true);

  ctx.clearRect(0, 0, PAGE_W, PAGE_H);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // ヘッダー
  if (cfg.showHeader) {
    const titleBlock = doc.blocks.find((b) => b.type === "title") as any;
    const headerText = cfg.headerText || (titleBlock ? `『${titleBlock.title}』${titleBlock.author}` : "");
    if (headerText) {
      ctx.font = fontStr(11, cfg);
      ctx.fillStyle = "#888";
      ctx.textBaseline = "top";
      ctx.fillText(headerText, M_LEFT, M_TOP + 2);
    }
  }

  // 区切り線
  ctx.strokeStyle = "#999";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(M_LEFT, SEP_Y);
  ctx.lineTo(PAGE_W - M_RIGHT, SEP_Y);
  ctx.stroke();

  // ページ番号
  if (cfg.showPageNumber) {
    ctx.font = fontStr(11, cfg);
    ctx.fillStyle = "#888";
    ctx.textBaseline = "bottom";
    const pn = `${currentPage + 1}`;
    ctx.fillText(pn, (PAGE_W - ctx.measureText(pn).width) / 2, PAGE_H - M_BOTTOM + 30);
  }

  // ─── 列描画 ───
  ctx.textBaseline = "top";
  let prevBI = -1;

  for (const col of cols) {
    if (col.page !== currentPage) continue;
    const block = doc.blocks[col.blockIndex];
    if (!block) continue;
    const isFirst = col.blockIndex !== prevBI;
    prevBI = col.blockIndex;
    const isActive = cursor?.blockIndex === col.blockIndex;

    // アクティブ列ハイライト
    if (isActive) {
      ctx.fillStyle = "rgba(59,130,246,0.05)";
      ctx.fillRect(col.x - COL_W / 2, M_TOP + HEADER_H, COL_W, PAGE_H - M_TOP - HEADER_H - M_BOTTOM);
    }

    // ─── 特殊列 ───
    if (col.special === "title") {
      ctx.font = fontStr(FONT_SIZE * 1.6, cfg, true);
      ctx.fillStyle = "#111";
      const fs = FONT_SIZE * 1.6;
      for (let i = 0; i < col.chars.length; i++) {
        const ch = col.chars[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - cw / 2, BODY_TOP + i * (fs + 6));
      }
      if (isActive && cursor?.field === "title") {
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(col.x - fs / 2, BODY_TOP + cursor.charIndex * (fs + 6), fs + 2, 3);
      }
      continue;
    }
    if (col.special === "author") {
      const fs = FONT_SIZE * 0.75;
      ctx.font = fontStr(fs, cfg);
      ctx.fillStyle = "#555";
      const offsetY = FONT_SIZE * 2.5;
      for (let i = 0; i < col.chars.length; i++) {
        const ch = col.chars[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - cw / 2, BODY_TOP + offsetY + i * (fs + 3));
      }
      if (isActive && cursor?.field === "author") {
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(col.x - fs / 2, BODY_TOP + offsetY + cursor.charIndex * (fs + 3), fs + 2, 3);
      }
      continue;
    }
    if (col.special === "castLabel" || col.special === "castChar") {
      const fs = col.special === "castLabel" ? SPEAKER_FONT_SIZE : SPEAKER_FONT_SIZE;
      ctx.font = fontStr(fs, cfg, col.special === "castLabel");
      ctx.fillStyle = col.special === "castLabel" ? "#555" : "#333";
      for (let i = 0; i < col.chars.length; i++) {
        const ch = col.chars[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - cw / 2, BODY_TOP + i * (fs + 3));
      }
      continue;
    }

    // ─── 話者名（serif最初の列のみ） ───
    if (isFirst && block.type === "serif") {
      ctx.font = speakerFont;
      ctx.fillStyle = "#222";
      const speaker = block.speaker || "";
      const spCharH = SPEAKER_FONT_SIZE + 2;
      const spBottom = SEP_Y - 3;
      const spTop = spBottom - speaker.length * spCharH;
      for (let i = 0; i < speaker.length; i++) {
        const ch = speaker[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - FONT_SIZE / 2 + (FONT_SIZE - cw) / 2, spTop + i * spCharH);
      }
      if (isActive && cursor?.field === "speaker") {
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(col.x - FONT_SIZE / 2 - 1, spTop + cursor.charIndex * spCharH, FONT_SIZE + 2, 2);
      }
    }

    // ─── 本文 ───
    ctx.font = bodyFont;
    ctx.fillStyle = block.type === "togaki" || block.type === "setting" ? "#333" : "#1a1a1a";
    for (let i = 0; i < col.chars.length; i++) {
      const ch = col.chars[i];
      const cw = ctx.measureText(ch).width;
      ctx.fillText(ch, col.x - FONT_SIZE / 2 + (FONT_SIZE - cw) / 2, BODY_TOP + i * CHAR_H);
    }

    // ─── カーソル ───
    if (isActive && (cursor?.field === "speech" || cursor?.field === "text")) {
      const li = cursor.charIndex - col.startCharIndex;
      if (li >= 0 && li <= col.chars.length && (li < CHARS_PER_COL || col.chars.length < CHARS_PER_COL)) {
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(col.x - FONT_SIZE / 2 - 1, BODY_TOP + li * CHAR_H, FONT_SIZE + 2, 2);
      }
    }
  }
}

// ─── ヒットテスト ───
export function hitTestScript(
  doc: PlayDocument,
  cols: ColLayout[],
  mx: number,
  my: number,
  currentPage: number
): CursorPosition | null {
  let bestCol: ColLayout | null = null;
  let bestDist = Infinity;
  for (const col of cols) {
    if (col.page !== currentPage) continue;
    const dist = Math.abs(mx - col.x);
    if (dist < bestDist) { bestDist = dist; bestCol = col; }
  }
  if (!bestCol) return null;

  const block = doc.blocks[bestCol.blockIndex];
  if (!block) return null;

  if (bestCol.special === "title") return { blockIndex: bestCol.blockIndex, field: "title", charIndex: bestCol.chars.length };
  if (bestCol.special === "author") return { blockIndex: bestCol.blockIndex, field: "author", charIndex: bestCol.chars.length };
  if (bestCol.special === "castLabel" || bestCol.special === "castChar") return null;

  if (my < SEP_Y && block.type === "serif") {
    const speaker = block.speaker || "";
    const spCharH = SPEAKER_FONT_SIZE + 2;
    const spBottom = SEP_Y - 3;
    const spTop = spBottom - speaker.length * spCharH;
    const idx = Math.min(Math.floor((my - spTop) / spCharH), speaker.length);
    return { blockIndex: bestCol.blockIndex, field: "speaker", charIndex: Math.max(0, idx) };
  }

  const li = Math.min(Math.floor((my - BODY_TOP) / CHAR_H), bestCol.chars.length);
  return { blockIndex: bestCol.blockIndex, field: bestCol.field as any, charIndex: bestCol.startCharIndex + Math.max(0, li) };
}

export function getMaxPage(cols: ColLayout[]): number {
  let max = 0;
  for (const col of cols) { if (col.page > max) max = col.page; }
  return max;
}
