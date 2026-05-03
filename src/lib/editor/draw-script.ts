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
const SPEAKER_MAX_CHARS = 5; // 話者名最大表示文字数
const SPEAKER_AREA_H = Math.round(SPEAKER_FONT_SIZE * SPEAKER_MAX_CHARS + 12); // 話者名エリア高さ
const HEADER_H = 18;
const SEP_Y = M_TOP + HEADER_H + SPEAKER_AREA_H; // 区切り線Y
const BODY_TOP = SEP_Y + 6; // 本文開始Y
const BODY_H = PAGE_H - M_BOTTOM - BODY_TOP;
const CHAR_H = Math.floor(BODY_H / CHARS_PER_COL); // 1文字の送りピッチ

export { PAGE_W, PAGE_H, COL_W, M_TOP, HEADER_H, SEP_Y };

/** カーソル描画（横線タイプ、縦書き用） */
function drawCursorLine(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  // メインカーソル（太い青線）
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(x, y, width, 3);
  // 両端に小さな三角形（視認性向上）
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 3, y - 4);
  ctx.lineTo(x + 3, y - 4);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + width, y);
  ctx.lineTo(x + width - 3, y - 4);
  ctx.lineTo(x + width + 3, y - 4);
  ctx.fill();
}

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

// ト書きフォントサイズ（本文より小さい）
const TOGAKI_FONT_SIZE = Math.round(10 * DPI / 72); // 10pt = 20px
// ト書きの字下げ（上からN文字分空ける）
const TOGAKI_INDENT_CHARS = 1;
// 登場人物の列幅（通常列の半分、きゅっと寄せる）
const CAST_COL_W = Math.round(COL_W * 0.55);

/** 列X座標（右端から数えて n 列目、pixelオフセット付き） */
function colX(pixelOffset: number): number {
  return PAGE_W - M_RIGHT - COL_W / 2 - pixelOffset;
}

export function computeColumns(doc: PlayDocument): ColLayout[] {
  const cols: ColLayout[] = [];
  let px = 0; // 右端からのピクセルオフセット
  let page = 0;
  let colsOnPage = 0;

  const advanceCol = (width: number = COL_W) => {
    px += width;
    colsOnPage++;
    if (colsOnPage >= COLS_PER_PAGE) {
      page++;
      colsOnPage = 0;
      px = 0;
    }
  };

  for (let bi = 0; bi < doc.blocks.length; bi++) {
    const block = doc.blocks[bi];

    switch (block.type) {
      case "title":
        // タイトル: 通常列幅
        cols.push({ blockIndex: bi, field: "title", x: colX(px), chars: block.title || "", startCharIndex: 0, page, special: "title" });
        advanceCol();
        // 作者: 通常列幅、ページ下部に配置（描画時にオフセット）
        cols.push({ blockIndex: bi, field: "author", x: colX(px), chars: block.author || "", startCharIndex: 0, page, special: "author" });
        advanceCol();
        break;

      case "castList":
        // 「登場人物」ラベル: 狭い列幅
        cols.push({ blockIndex: bi, field: "text", x: colX(px), chars: "登場人物", startCharIndex: 0, page, special: "castLabel" });
        advanceCol(CAST_COL_W);
        // 各キャラクター: 狭い列幅で寄せる
        for (let k = 0; k < block.characters.length; k++) {
          cols.push({ blockIndex: bi, field: "text", x: colX(px), chars: block.characters[k].name, startCharIndex: k, page, special: "castChar" });
          advanceCol(CAST_COL_W);
        }
        break;

      case "togaki": {
        // ト書き: 通常列幅だが小さいフォント → 1列に入る文字数が多い
        const togakiCharsPerCol = Math.floor(BODY_H / (TOGAKI_FONT_SIZE + Math.round(TOGAKI_FONT_SIZE * 0.35)));
        const text = block.text || "";
        if (text.length === 0) {
          cols.push({ blockIndex: bi, field: "text", x: colX(px), chars: "", startCharIndex: 0, page });
          advanceCol();
        } else {
          for (let i = 0; i < text.length; i += togakiCharsPerCol) {
            cols.push({ blockIndex: bi, field: "text", x: colX(px), chars: text.slice(i, i + togakiCharsPerCol), startCharIndex: i, page });
            advanceCol();
          }
        }
        break;
      }

      default: {
        const fieldName = block.type === "serif" ? "speech" : "text";
        const text = block.type === "serif" ? (block.speech || "") : ((block as any).text || "");
        if (text.length === 0) {
          cols.push({ blockIndex: bi, field: fieldName as any, x: colX(px), chars: "", startCharIndex: 0, page });
          advanceCol();
        } else {
          for (let i = 0; i < text.length; i += CHARS_PER_COL) {
            cols.push({ blockIndex: bi, field: fieldName as any, x: colX(px), chars: text.slice(i, i + CHARS_PER_COL), startCharIndex: i, page });
            advanceCol();
          }
        }
        break;
      }
    }
  }
  return cols;
}

/** 選択範囲 */
export type SelectionRange = {
  blockIndex: number;
  field: string;
  start: number;
  end: number;
} | null;

// ─── 描画 ───
export type ScriptDragState = {
  draggingIndex: number;
  mouseX: number;
} | null;

export function drawScript(
  ctx: CanvasRenderingContext2D,
  doc: PlayDocument,
  cols: ColLayout[],
  cursor: CursorPosition | null,
  currentPage: number,
  selection: SelectionRange = null,
  blockDrag: ScriptDragState = null,
  composingText: string = ""
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
    const headerText = cfg.headerText || (titleBlock?.title ? `『${titleBlock.title}』${titleBlock.author || ""}` : "");
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
      const fs = FONT_SIZE * 1.6;
      if (col.chars.length === 0 && isActive) {
        ctx.font = fontStr(fs * 0.6, cfg);
        ctx.fillStyle = "#ccc";
        const ph = "タイトル";
        for (let i = 0; i < ph.length; i++) {
          const cw = ctx.measureText(ph[i]).width;
          ctx.fillText(ph[i], col.x - cw / 2, BODY_TOP + i * (fs * 0.6 + 4));
        }
      }
      ctx.font = fontStr(fs, cfg, true);
      ctx.fillStyle = "#111";
      for (let i = 0; i < col.chars.length; i++) {
        const ch = col.chars[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - cw / 2, BODY_TOP + i * (fs + 6));
      }
      if (isActive && cursor?.field === "title") {
        drawCursorLine(ctx, col.x - fs / 2, BODY_TOP + cursor.charIndex * (fs + 6), fs + 2);
      }
      continue;
    }
    if (col.special === "author") {
      const fs = FONT_SIZE * 0.65;
      const lineH = fs + 3;
      ctx.font = fontStr(fs, cfg);
      ctx.fillStyle = "#555";
      const offsetY = BODY_H * 0.45;
      if (col.chars.length === 0 && isActive) {
        ctx.fillStyle = "#ccc";
        const ph = "作者名";
        for (let i = 0; i < ph.length; i++) {
          const cw = ctx.measureText(ph[i]).width;
          ctx.fillText(ph[i], col.x - cw / 2, BODY_TOP + offsetY + i * lineH);
        }
        ctx.fillStyle = "#555";
      }
      for (let i = 0; i < col.chars.length; i++) {
        const ch = col.chars[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - cw / 2, BODY_TOP + offsetY + i * lineH);
      }
      if (isActive && cursor?.field === "author") {
        drawCursorLine(ctx, col.x - fs / 2, BODY_TOP + offsetY + cursor.charIndex * lineH, fs + 2);
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
      const speaker = block.speaker || "";
      const spFontSize = speaker.length > SPEAKER_MAX_CHARS
        ? Math.floor(SPEAKER_FONT_SIZE * SPEAKER_MAX_CHARS / speaker.length)
        : SPEAKER_FONT_SIZE;
      const spCharH = spFontSize + 2;
      const spBottom = SEP_Y - 3;

      if (speaker.length === 0) {
        // 空の話者名: プレースホルダー + カーソル
        if (isActive && cursor?.field === "speaker") {
          ctx.font = fontStr(SPEAKER_FONT_SIZE * 0.8, cfg);
          ctx.fillStyle = "#bbb";
          const ph = "名前";
          const phTop = spBottom - ph.length * (SPEAKER_FONT_SIZE * 0.8 + 2);
          for (let i = 0; i < ph.length; i++) {
            const cw = ctx.measureText(ph[i]).width;
            ctx.fillText(ph[i], col.x - FONT_SIZE / 2 + (FONT_SIZE - cw) / 2, phTop + i * (SPEAKER_FONT_SIZE * 0.8 + 2));
          }
          drawCursorLine(ctx, col.x - FONT_SIZE / 2 - 1, spBottom, FONT_SIZE + 2);
        }
      } else {
        ctx.font = fontStr(spFontSize, cfg, true);
        ctx.fillStyle = "#222";
        const spTop = spBottom - speaker.length * spCharH;
        for (let i = 0; i < speaker.length; i++) {
          const ch = speaker[i];
          const cw = ctx.measureText(ch).width;
          ctx.fillText(ch, col.x - FONT_SIZE / 2 + (FONT_SIZE - cw) / 2, spTop + i * spCharH);
        }
        if (isActive && cursor?.field === "speaker") {
          drawCursorLine(ctx, col.x - FONT_SIZE / 2 - 1, spTop + cursor.charIndex * spCharH, FONT_SIZE + 2);
        }
      }
    }

    // ─── 選択ハイライト + 本文 ───
    const isTg = block.type === "togaki" || block.type === "setting";
    const fs = isTg ? TOGAKI_FONT_SIZE : FONT_SIZE;
    const cH = isTg ? (TOGAKI_FONT_SIZE + Math.round(TOGAKI_FONT_SIZE * 0.35)) : CHAR_H;
    const indent = isTg ? TOGAKI_INDENT_CHARS * CHAR_H : 0;

    // 選択ハイライト描画
    if (selection && selection.blockIndex === col.blockIndex &&
        ((col.field === "speech" && selection.field === "speech") ||
         (col.field === "text" && selection.field === "text"))) {
      const selStart = Math.max(selection.start - col.startCharIndex, 0);
      const selEnd = Math.min(selection.end - col.startCharIndex, col.chars.length);
      if (selEnd > selStart) {
        ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
        ctx.fillRect(
          col.x - fs / 2 - 2,
          BODY_TOP + indent + selStart * cH,
          fs + 4,
          (selEnd - selStart) * cH
        );
      }
    }

    // 本文テキスト描画
    ctx.font = isTg ? fontStr(TOGAKI_FONT_SIZE, cfg) : bodyFont;
    if (col.chars.length === 0 && isActive && col.startCharIndex === 0) {
      // 空フィールドのプレースホルダー
      const placeholders: Record<string, string> = {
        serif: "セリフ",
        togaki: "ト書き",
        setting: "舞台設定",
        sceneHeading: "場面",
        endMark: "おわり",
      };
      const ph = placeholders[block.type] || "";
      if (ph) {
        ctx.font = fontStr(fs * 0.75, cfg);
        ctx.fillStyle = "#ccc";
        for (let i = 0; i < ph.length; i++) {
          const cw = ctx.measureText(ph[i]).width;
          ctx.fillText(ph[i], col.x - fs / 2 + (fs - cw) / 2, BODY_TOP + indent + i * (fs * 0.75 + 3));
        }
      }
    }
    ctx.font = isTg ? fontStr(TOGAKI_FONT_SIZE, cfg) : bodyFont;
    ctx.fillStyle = isTg ? "#333" : "#1a1a1a";
    for (let i = 0; i < col.chars.length; i++) {
      const ch = col.chars[i];
      const cw = ctx.measureText(ch).width;
      ctx.fillText(ch, col.x - fs / 2 + (fs - cw) / 2, BODY_TOP + indent + i * cH);
    }

    // カーソル描画
    if (isActive && (cursor?.field === "speech" || cursor?.field === "text")) {
      const li = cursor.charIndex - col.startCharIndex;
      if (li >= 0 && li <= col.chars.length && (li < CHARS_PER_COL || col.chars.length < CHARS_PER_COL)) {
        drawCursorLine(ctx, col.x - fs / 2 - 1, BODY_TOP + indent + li * cH, fs + 2);
      }
    }

    // IME変換中テキスト（下線付き仮表示）
    if (composingText && isActive && (cursor?.field === "speech" || cursor?.field === "text")) {
      const li = cursor.charIndex - col.startCharIndex;
      if (li >= 0 && li <= col.chars.length) {
        ctx.font = bodyFont;
        ctx.fillStyle = "#2563eb";
        for (let ci = 0; ci < composingText.length; ci++) {
          const ch = composingText[ci];
          const cw = ctx.measureText(ch).width;
          const cy = BODY_TOP + indent + (li + ci) * cH;
          ctx.fillText(ch, col.x - fs / 2 + (fs - cw) / 2, cy);
          // 下線
          ctx.fillRect(col.x - fs / 2, cy + cH - 2, fs, 1);
        }
      }
    }

    // ドラッグハンドル（各ブロックの最初の列、ヘッダー領域にドット）
    if (isFirst && !col.special) {
      ctx.fillStyle = "#ccc";
      const hx = col.x;
      const hy = M_TOP + HEADER_H + 4;
      for (let r = 0; r < 2; r++) {
        for (let c = -1; c <= 1; c++) {
          ctx.beginPath();
          ctx.arc(hx + c * 4, hy + r * 4, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // ─── ドラッグインジケーター ───
  if (blockDrag) {
    const dropIdx = findScriptDropIndex(cols, blockDrag.mouseX, currentPage);
    // ドロップ先の縦線
    const dropCol = cols.find((c) => c.page === currentPage && c.blockIndex === dropIdx);
    const dropX = dropCol ? dropCol.x + COL_W / 2 + 2 : M_LEFT;
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(dropX, M_TOP + HEADER_H);
    ctx.lineTo(dropX, PAGE_H - M_BOTTOM);
    ctx.stroke();
  }
}

/** 縦書きモード: ドロップ先インデックス */
export function findScriptDropIndex(cols: ColLayout[], mouseX: number, currentPage: number): number {
  // マウスX位置より右にある最初のブロックの前に挿入
  let lastBI = -1;
  for (const col of cols) {
    if (col.page !== currentPage) continue;
    if (col.special) continue;
    if (col.blockIndex === lastBI) continue;
    lastBI = col.blockIndex;
    if (mouseX > col.x) return col.blockIndex;
  }
  return lastBI >= 0 ? lastBI + 1 : 0;
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
    // 空の話者名でも区切り線の上をクリックしたらspeakerフィールドに移動
    const speaker = block.speaker || "";
    if (speaker.length === 0) {
      return { blockIndex: bestCol.blockIndex, field: "speaker", charIndex: 0 };
    }
    const spFontSize = speaker.length > SPEAKER_MAX_CHARS
      ? Math.floor(SPEAKER_FONT_SIZE * SPEAKER_MAX_CHARS / speaker.length)
      : SPEAKER_FONT_SIZE;
    const spCharH = spFontSize + 2;
    const spBottom = SEP_Y - 3;
    const spTop = spBottom - speaker.length * spCharH;
    const idx = Math.min(Math.floor((my - spTop) / spCharH), speaker.length);
    return { blockIndex: bestCol.blockIndex, field: "speaker", charIndex: Math.max(0, idx) };
  }

  // セリフブロックでspeakerが空なら、本文エリアクリックでもspeakerに移動
  if (block.type === "serif" && !block.speaker) {
    return { blockIndex: bestCol.blockIndex, field: "speaker", charIndex: 0 };
  }

  // ト書きはインデントとフォントサイズが異なる
  const isTg = block.type === "togaki" || block.type === "setting";
  const tCharH = isTg ? (TOGAKI_FONT_SIZE + Math.round(TOGAKI_FONT_SIZE * 0.35)) : CHAR_H;
  const tIndent = isTg ? TOGAKI_INDENT_CHARS * CHAR_H : 0;
  const li = Math.min(Math.floor((my - BODY_TOP - tIndent) / tCharH), bestCol.chars.length);
  return { blockIndex: bestCol.blockIndex, field: bestCol.field as any, charIndex: bestCol.startCharIndex + Math.max(0, li) };
}

export function getMaxPage(cols: ColLayout[]): number {
  let max = 0;
  for (const col of cols) { if (col.page > max) max = col.page; }
  return max;
}
