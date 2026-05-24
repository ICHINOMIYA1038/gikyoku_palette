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
const FONT_SIZE = Math.round(10 * DPI / 72); // 10pt = 20px (基準サイズ)
const SERIF_FONT_SIZE = Math.round(9 * DPI / 72); // セリフ本文 9pt = 18px
const SPEAKER_FONT_SIZE = Math.round(8.5 * DPI / 72); // 話者名 8.5pt = 17px
const COLS_PER_PAGE = 20;
// 行間: 文字サイズの1.5倍程度をピッチに（読みやすさ重視）
const LINE_PITCH_RATIO = 1.5;

// ─── 計算値 ───
const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT; // 本文エリア幅
const _CONTENT_H = PAGE_H - M_TOP - M_BOTTOM; // 本文エリア高さ（参考値、未使用）
const COL_W = Math.floor(CONTENT_W / COLS_PER_PAGE); // 列幅
const SPEAKER_MAX_CHARS = 5; // 話者名最大表示文字数
const SPEAKER_AREA_H = Math.round(SPEAKER_FONT_SIZE * SPEAKER_MAX_CHARS + 12); // 話者名エリア高さ
const HEADER_H = 18;
const SEP_Y = M_TOP + HEADER_H + SPEAKER_AREA_H; // 区切り線Y
const BODY_TOP = SEP_Y + 20; // 本文開始Y（話者名との余白を広めに）
const BODY_H = PAGE_H - M_BOTTOM - BODY_TOP;
const CHAR_H = Math.round(FONT_SIZE * LINE_PITCH_RATIO); // 1文字の送りピッチ
const CHARS_PER_COL = Math.floor(BODY_H / CHAR_H); // 1列に入る文字数

export { PAGE_W, PAGE_H, COL_W, M_TOP, HEADER_H, SEP_Y };

export type CursorRect = { x: number; y: number; w: number; h: number };

/** カーソル描画（横線タイプ、縦書き用） */
function drawCursorLine(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, out?: { rect: CursorRect | null }) {
  if (out) out.rect = { x: x - 6, y: y - 6, w: width + 12, h: width + 12 };
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
  special?: "title" | "author" | "castLabel" | "castChar" | "sceneHeading";
};

// ト書きフォントサイズ（本文より小さい）
const TOGAKI_FONT_SIZE = Math.round(8 * DPI / 72); // 8pt = 16px
// ト書きの字下げ（上からN文字分空ける）
const TOGAKI_INDENT_CHARS = 1;
// 登場人物の列幅（通常列の半分、きゅっと寄せる）
const CAST_COL_W = Math.round(COL_W * 0.55);

/** 列X座標（右端から数えて n 列目、pixelオフセット付き） */
function colX(pixelOffset: number): number {
  return PAGE_W - M_RIGHT - COL_W / 2 - pixelOffset;
}

/** 縦書きで90度回転して描画すべき文字（横棒・括弧類） */
const ROTATE_CHARS = new Set([
  "ー", "−", "－", "‐", "—", "―", "─", "━",
  "〜", "～", "＝", "=",
  "（", "）", "(", ")",
  "「", "」", "『", "』",
  "［", "］", "[", "]",
  "【", "】", "〔", "〕",
  "〈", "〉", "《", "》",
  "｛", "｝", "{", "}",
  "<", ">", "＜", "＞",
  "…", "‥", "⋯",
]);

/** 縦書きで右上に配置すべき句読点。横書きグリフの自然位置が左下にあるので、
 *  Unicode縦書き変形(プレゼンテーション形式)に置換する */
const PUNCT_SHIFT_TOPRIGHT = new Set(["、", "。", "．", "，", ",", "."]);
const VERTICAL_FORM: Record<string, string> = {
  "、": "︑", // U+FE11
  "。": "︒", // U+FE12
  "．": "︒",
  "，": "︑",
  ",": "︑",
  ".": "︒",
};

/**
 * 縦書き用に1文字を描画する。回転・位置調整を自動で行う。
 * @param x 列の中央X
 * @param y 文字セル上端Y
 * @param cellH 文字セルの送り（縦方向のピッチ）
 * @param fs フォントサイズ
 */
function drawVerticalChar(
  ctx: CanvasRenderingContext2D,
  ch: string,
  x: number,
  y: number,
  cellH: number,
  fs: number
) {
  const cw = ctx.measureText(ch).width;
  if (ROTATE_CHARS.has(ch)) {
    // 90度時計回りに回転。文字セルの中央を回転中心にする
    ctx.save();
    ctx.translate(x, y + cellH / 2);
    ctx.rotate(Math.PI / 2);
    // 回転後、原点を起点に水平に描画 → 中央寄せ
    ctx.fillText(ch, -cw / 2, -fs * 0.35);
    ctx.restore();
    return;
  }
  if (PUNCT_SHIFT_TOPRIGHT.has(ch)) {
    // Unicode縦書き形に置換して右上配置
    const v = VERTICAL_FORM[ch] || ch;
    const vw = ctx.measureText(v).width;
    ctx.fillText(v, x + fs / 2 - vw, y);
    return;
  }
  ctx.fillText(ch, x - cw / 2, y);
}

/** テキストを改行(\n)で段落分けし、各段落をcharsPerColで列分割する。startCharIndexは元テキスト全体での位置 */
function splitTextByNewline(text: string, charsPerCol: number): Array<{ chars: string; startCharIndex: number }> {
  const result: Array<{ chars: string; startCharIndex: number }> = [];
  const paragraphs = text.split("\n");
  let absPos = 0;
  for (let pi = 0; pi < paragraphs.length; pi++) {
    const p = paragraphs[pi];
    if (p.length === 0) {
      result.push({ chars: "", startCharIndex: absPos });
    } else {
      for (let i = 0; i < p.length; i += charsPerCol) {
        result.push({ chars: p.slice(i, i + charsPerCol), startCharIndex: absPos + i });
      }
    }
    absPos += p.length + 1; // +1 for \n
  }
  if (result.length === 0) result.push({ chars: "", startCharIndex: 0 });
  return result;
}

// 同一ブロック内の列ピッチ（改行/折返し時の列間隔。極めて詰める）
const WITHIN_BLOCK_COL_W = Math.round(COL_W * 0.5);
// ブロック境界の追加余白（種別が変わる時）
const BLOCK_GAP_W = Math.round(COL_W * 0.35);
// セリフ→セリフ等、同種別ブロック間は追加余白なし
const SAME_KIND_GAP_W = 0;

export function computeColumns(doc: PlayDocument): ColLayout[] {
  const cols: ColLayout[] = [];
  let px = 0; // 右端からのピクセルオフセット
  let page = 0;
  let _colsOnPage = 0;
  let lastBlockIndex = -1;
  let lastBlockType: string | null = null;
  let isFirstColOfBlock = true;

  const CONTENT_W_LIMIT = PAGE_W - M_LEFT - M_RIGHT;
  const advanceCol = (width: number = COL_W) => {
    px += width;
    _colsOnPage++;
    // ページ送りは横幅基準。コンテンツ幅を超えそうなら次ページへ
    if (px >= CONTENT_W_LIMIT) {
      page++;
      _colsOnPage = 0;
      px = 0;
    }
  };

  // ブロック切り替え時に余白を追加（同種別なら極小、異種別なら大きめ）
  const onBlockStart = (bi: number, type: string) => {
    if (lastBlockIndex !== -1 && lastBlockIndex !== bi) {
      px += (lastBlockType === type) ? SAME_KIND_GAP_W : BLOCK_GAP_W;
    }
    lastBlockIndex = bi;
    lastBlockType = type;
    isFirstColOfBlock = true;
  };

  // 同一ブロック内の列ピッチ（first/後続を区別せず全てタイトに）
  const colWidthFor = (special?: string) => {
    if (special === "castLabel" || special === "castChar") return CAST_COL_W;
    if (isFirstColOfBlock) isFirstColOfBlock = false;
    return WITHIN_BLOCK_COL_W;
  };

  for (let bi = 0; bi < doc.blocks.length; bi++) {
    const block = doc.blocks[bi];
    onBlockStart(bi, block.type);

    switch (block.type) {
      case "title":
        cols.push({ blockIndex: bi, field: "title", x: colX(px), chars: block.title || "", startCharIndex: 0, page, special: "title" });
        advanceCol(colWidthFor("title"));
        cols.push({ blockIndex: bi, field: "author", x: colX(px), chars: block.author || "", startCharIndex: 0, page, special: "author" });
        advanceCol(colWidthFor("author"));
        break;

      case "castList":
        cols.push({ blockIndex: bi, field: "text", x: colX(px), chars: "登場人物", startCharIndex: 0, page, special: "castLabel" });
        advanceCol(colWidthFor("castLabel"));
        if (block.characters.length === 0) {
          cols.push({ blockIndex: bi, field: "text", x: colX(px), chars: "", startCharIndex: 0, page, special: "castChar" });
          advanceCol(colWidthFor("castChar"));
        } else {
          for (let k = 0; k < block.characters.length; k++) {
            cols.push({ blockIndex: bi, field: "text", x: colX(px), chars: block.characters[k].name, startCharIndex: k, page, special: "castChar" });
            advanceCol(colWidthFor("castChar"));
          }
        }
        break;

      case "togaki": {
        const togakiCharsPerCol = Math.floor(BODY_H / (TOGAKI_FONT_SIZE + Math.round(TOGAKI_FONT_SIZE * 0.35)));
        const text = block.text || "";
        const lines = splitTextByNewline(text, togakiCharsPerCol);
        for (const line of lines) {
          cols.push({ blockIndex: bi, field: "text", x: colX(px), chars: line.chars, startCharIndex: line.startCharIndex, page });
          advanceCol(colWidthFor());
        }
        break;
      }

      case "sceneHeading": {
        const text = block.text || "";
        const lines = splitTextByNewline(text, CHARS_PER_COL);
        for (const line of lines) {
          cols.push({ blockIndex: bi, field: "text", x: colX(px), chars: line.chars, startCharIndex: line.startCharIndex, page, special: "sceneHeading" });
          advanceCol(colWidthFor("sceneHeading"));
        }
        break;
      }

      default: {
        const fieldName: ColLayout["field"] =
          block.type === "serif" ? "speech" : "text";
        const text =
          block.type === "serif"
            ? block.speech || ""
            : "text" in block
            ? block.text || ""
            : "";
        const lines = splitTextByNewline(text, CHARS_PER_COL);
        for (const line of lines) {
          cols.push({ blockIndex: bi, field: fieldName, x: colX(px), chars: line.chars, startCharIndex: line.startCharIndex, page });
          advanceCol(colWidthFor());
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
  composingText: string = "",
  cursorOut?: { rect: CursorRect | null },
  printMode: boolean = false
) {
  if (cursorOut) cursorOut.rect = null;
  const _cur = cursorOut; // 内側でdrawCursorLineに渡せるよう別名
  const cfg = doc.typesetting || DEFAULT_TYPESETTING;
  // 計算済みフォント文字列（draw-* 関数内では再計算するためここでは未使用）
  const _bodyFont = fontStr(FONT_SIZE, cfg);
  const _speakerFont = fontStr(SPEAKER_FONT_SIZE, cfg, true);

  ctx.clearRect(0, 0, PAGE_W, PAGE_H);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // ヘッダー
  if (cfg.showHeader) {
    const titleBlock = doc.blocks.find((b) => b.type === "title");
    const headerText =
      cfg.headerText ||
      (titleBlock && titleBlock.type === "title" && titleBlock.title
        ? `『${titleBlock.title}』${titleBlock.author || ""}`
        : "");
    if (headerText) {
      ctx.font = fontStr(11, cfg);
      ctx.fillStyle = "#888";
      ctx.textBaseline = "top";
      ctx.fillText(headerText, M_LEFT, M_TOP + 2);
    }
  }

  // 区切り線（セリフブロックの列がある区間のみ描画）
  ctx.strokeStyle = "#999";
  ctx.lineWidth = 0.5;
  let segStart: number | null = null;
  for (const c of cols) {
    if (c.page !== currentPage) continue;
    const block = doc.blocks[c.blockIndex];
    const isSerif = block?.type === "serif";
    const left = c.x - COL_W / 2;
    const right = c.x + COL_W / 2;
    if (isSerif) {
      if (segStart === null) segStart = right; // 右端から左へ広げる
      segStart = Math.max(segStart, right);
      // 一度区間を保留し、最後にまとめて描画する形でもよいが、簡易に1列ずつ線分を引く
      ctx.beginPath();
      ctx.moveTo(left, SEP_Y);
      ctx.lineTo(right, SEP_Y);
      ctx.stroke();
    }
  }

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
      // タイトルは話者名エリアも使って大きく表示
      const fs = FONT_SIZE * 2.0;
      const lineH = fs + 8;
      const TITLE_TOP = M_TOP + HEADER_H + 24;
      const titleComposing = isActive && cursor?.field === "title" && composingText.length > 0;
      if (col.chars.length === 0 && isActive && !titleComposing) {
        ctx.font = fontStr(fs * 0.6, cfg);
        ctx.fillStyle = "#ccc";
        const ph = "タイトル";
        for (let i = 0; i < ph.length; i++) {
          const cw = ctx.measureText(ph[i]).width;
          ctx.fillText(ph[i], col.x - cw / 2, TITLE_TOP + i * (fs * 0.6 + 4));
        }
      }
      ctx.font = fontStr(fs, cfg, true);
      ctx.fillStyle = "#111";
      for (let i = 0; i < col.chars.length; i++) {
        const ch = col.chars[i];
        const shift = titleComposing && i >= cursor!.charIndex ? composingText.length : 0;
        drawVerticalChar(ctx, ch, col.x, TITLE_TOP + (i + shift) * lineH, lineH, fs);
      }
      if (isActive && cursor?.field === "title") {
        if (titleComposing) {
          for (let ci = 0; ci < composingText.length; ci++) {
            const ch = composingText[ci];
            const cy = TITLE_TOP + (cursor.charIndex + ci) * lineH;
            drawVerticalChar(ctx, ch, col.x, cy, lineH, fs);
            ctx.fillRect(col.x - fs / 2 - 2, cy + 2, 1, lineH - 4);
          }
        }
        drawCursorLine(ctx, col.x - fs / 2, TITLE_TOP + (cursor.charIndex + composingText.length) * lineH, fs + 2, _cur);
      }
      continue;
    }
    if (col.special === "author") {
      const fs = FONT_SIZE * 0.65;
      const lineH = fs + 3;
      ctx.font = fontStr(fs, cfg);
      ctx.fillStyle = "#555";
      const offsetY = BODY_H * 0.45;
      const authorComposing = isActive && cursor?.field === "author" && composingText.length > 0;
      if (col.chars.length === 0 && isActive && !authorComposing) {
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
        const shift = authorComposing && i >= cursor!.charIndex ? composingText.length : 0;
        drawVerticalChar(ctx, ch, col.x, BODY_TOP + offsetY + (i + shift) * lineH, lineH, fs);
      }
      if (isActive && cursor?.field === "author") {
        if (authorComposing) {
          ctx.fillStyle = "#555";
          for (let ci = 0; ci < composingText.length; ci++) {
            const ch = composingText[ci];
            const cy = BODY_TOP + offsetY + (cursor.charIndex + ci) * lineH;
            drawVerticalChar(ctx, ch, col.x, cy, lineH, fs);
            ctx.fillRect(col.x - fs / 2 - 2, cy + 2, 1, lineH - 4);
          }
        }
        drawCursorLine(ctx, col.x - fs / 2, BODY_TOP + offsetY + (cursor.charIndex + composingText.length) * lineH, fs + 2, _cur);
      }
      continue;
    }
    if (col.special === "castLabel" || col.special === "castChar") {
      const fs = SPEAKER_FONT_SIZE;
      const lineH = fs + 3;
      ctx.font = fontStr(fs, cfg, col.special === "castLabel");
      const isCharActive = col.special === "castChar" && isActive && cursor?.castIndex === col.startCharIndex;
      const composingHere = isCharActive && composingText.length > 0;

      if (col.special === "castChar" && col.chars.length === 0 && !composingHere) {
        ctx.fillStyle = "#ccc";
        const ph = "人物名";
        for (let i = 0; i < ph.length; i++) {
          drawVerticalChar(ctx, ph[i], col.x, BODY_TOP + i * lineH, lineH, fs);
        }
      } else {
        ctx.fillStyle = col.special === "castLabel" ? "#555" : "#333";
        for (let i = 0; i < col.chars.length; i++) {
          const ch = col.chars[i];
          const shift = composingHere && i >= (cursor?.charIndex || 0) ? composingText.length : 0;
          drawVerticalChar(ctx, ch, col.x, BODY_TOP + (i + shift) * lineH, lineH, fs);
        }
      }
      // 未確定文字
      if (composingHere) {
        ctx.fillStyle = "#333";
        for (let ci = 0; ci < composingText.length; ci++) {
          const ch = composingText[ci];
          const cy = BODY_TOP + ((cursor?.charIndex || 0) + ci) * lineH;
          drawVerticalChar(ctx, ch, col.x, cy, lineH, fs);
          ctx.fillRect(col.x - fs / 2 - 2, cy + 2, 1, lineH - 4);
        }
      }
      // カーソル
      if (isCharActive) {
        const cli = (cursor?.charIndex || 0) + composingText.length;
        drawCursorLine(ctx, col.x - fs / 2, BODY_TOP + cli * lineH, fs + 2, _cur);
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
          // IME未確定: 空話者の場合は spBottom から下方向に積む
          if (composingText) {
            ctx.font = fontStr(SPEAKER_FONT_SIZE, cfg, true);
            ctx.fillStyle = "#222";
            for (let ci = 0; ci < composingText.length; ci++) {
              const ch = composingText[ci];
              const cw = ctx.measureText(ch).width;
              ctx.fillText(ch, col.x - FONT_SIZE / 2 + (FONT_SIZE - cw) / 2, spBottom - (composingText.length - ci) * (SPEAKER_FONT_SIZE + 2));
            }
          }
          drawCursorLine(ctx, col.x - FONT_SIZE / 2 - 1, spBottom, FONT_SIZE + 2, _cur);
        }
      } else {
        ctx.font = fontStr(spFontSize, cfg, true);
        ctx.fillStyle = "#222";
        const speakerComposing = isActive && cursor?.field === "speaker" && composingText.length > 0;
        const totalLen = speaker.length + (speakerComposing ? composingText.length : 0);
        const spTop = spBottom - totalLen * spCharH;
        for (let i = 0; i < speaker.length; i++) {
          const ch = speaker[i];
          const shift = speakerComposing && i >= cursor!.charIndex ? composingText.length : 0;
          drawVerticalChar(ctx, ch, col.x, spTop + (i + shift) * spCharH, spCharH, spFontSize);
        }
        if (isActive && cursor?.field === "speaker") {
          if (composingText) {
            for (let ci = 0; ci < composingText.length; ci++) {
              const ch = composingText[ci];
              const cy = spTop + (cursor.charIndex + ci) * spCharH;
              drawVerticalChar(ctx, ch, col.x, cy, spCharH, spFontSize);
              ctx.fillRect(col.x - FONT_SIZE / 2 - 2, cy + 2, 1, spCharH - 4);
            }
          }
          drawCursorLine(ctx, col.x - FONT_SIZE / 2 - 1, spTop + (cursor.charIndex + composingText.length) * spCharH, FONT_SIZE + 2, _cur);
        }
      }
    }

    // ─── 場面ヘッダー（大きく、上に区切り線） ───
    if (col.special === "sceneHeading") {
      const fs = Math.round(FONT_SIZE * 1.35);
      const lineH = fs + 8;
      // 上部の罫線
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(col.x - COL_W / 2 + 4, BODY_TOP - 4);
      ctx.lineTo(col.x + COL_W / 2 - 4, BODY_TOP - 4);
      ctx.stroke();
      ctx.font = fontStr(fs, cfg, true);
      ctx.fillStyle = "#111";
      const startY = BODY_TOP + 12;
      for (let i = 0; i < col.chars.length; i++) {
        drawVerticalChar(ctx, col.chars[i], col.x, startY + i * lineH, lineH, fs);
      }
      if (isActive && cursor?.field === "text") {
        const li = cursor.charIndex - col.startCharIndex;
        if (li >= 0 && li <= col.chars.length) {
          drawCursorLine(ctx, col.x - fs / 2 - 1, startY + li * lineH, fs + 2, _cur);
        }
      }
      continue;
    }

    // ─── 選択ハイライト + 本文 ───
    const isTg = block.type === "togaki";
    const isSerif = block.type === "serif";
    const fs = isTg ? TOGAKI_FONT_SIZE : isSerif ? SERIF_FONT_SIZE : FONT_SIZE;
    const cH = isTg
      ? TOGAKI_FONT_SIZE + Math.round(TOGAKI_FONT_SIZE * 0.35)
      : isSerif
        ? Math.round(SERIF_FONT_SIZE * LINE_PITCH_RATIO)
        : CHAR_H;
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
    ctx.font = fontStr(fs, cfg);
    if (col.chars.length === 0 && isActive && col.startCharIndex === 0) {
      // 空フィールドのプレースホルダー
      const placeholders: Record<string, string> = {
        serif: "セリフ",
        togaki: "ト書き",
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
    ctx.font = fontStr(fs, cfg);
    ctx.fillStyle = isTg ? "#333" : "#1a1a1a";
    // composing中はカーソル位置以降の文字を下にずらす
    const composingActive = composingText && isActive && (cursor?.field === "speech" || cursor?.field === "text");
    const composingOffsetIdx = composingActive ? (cursor!.charIndex - col.startCharIndex) : -1;
    for (let i = 0; i < col.chars.length; i++) {
      const ch = col.chars[i];
      const shift = composingOffsetIdx >= 0 && i >= composingOffsetIdx ? composingText.length : 0;
      drawVerticalChar(ctx, ch, col.x, BODY_TOP + indent + (i + shift) * cH, cH, fs);
    }

    // 入力中テキスト（本文と同色＋下線で区別、後続文字は既にshiftで押し下げ済み）
    if (composingText && isActive && (cursor?.field === "speech" || cursor?.field === "text")) {
      const li = cursor.charIndex - col.startCharIndex;
      if (li >= 0 && li <= col.chars.length) {
        ctx.font = fontStr(fs, cfg);
        ctx.fillStyle = isTg ? "#333" : "#1a1a1a";
        for (let ci = 0; ci < composingText.length; ci++) {
          const ch = composingText[ci];
          const cy = BODY_TOP + indent + (li + ci) * cH;
          drawVerticalChar(ctx, ch, col.x, cy, cH, fs);
          // 縦書き未確定下線（文字の左側に薄い線）
          ctx.fillRect(col.x - fs / 2 - 2, cy + 2, 1, cH - 4);
        }
      }
    }

    // カーソル描画（未確定中は未確定文字の末尾に表示）
    if (isActive && (cursor?.field === "speech" || cursor?.field === "text")) {
      const li = cursor.charIndex - col.startCharIndex;
      const cursorLi = composingText ? li + composingText.length : li;
      if (li >= 0 && cursorLi <= col.chars.length + (composingText?.length || 0)) {
        drawCursorLine(ctx, col.x - fs / 2 - 1, BODY_TOP + indent + cursorLi * cH, fs + 2, _cur);
      }
    }

    // ドラッグハンドル（各ブロックの最初の列、ヘッダー領域にドット）
    if (isFirst && !col.special && !printMode) {
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

/** 任意のブロック（castList含む）に対するヒットテスト。右クリックメニュー等の「ブロック単位の操作」用 */
export function hitTestScriptAnyBlock(cols: ColLayout[], mx: number, currentPage: number): number | null {
  let bestCol: ColLayout | null = null;
  let bestDist = Infinity;
  for (const col of cols) {
    if (col.page !== currentPage) continue;
    const dist = Math.abs(mx - col.x);
    if (dist < bestDist) { bestDist = dist; bestCol = col; }
  }
  return bestCol ? bestCol.blockIndex : null;
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
  if (bestCol.special === "castLabel") {
    // ラベル列クリック → 0番目の人物を編集
    return { blockIndex: bestCol.blockIndex, field: "text", charIndex: 0, castIndex: 0 };
  }
  if (bestCol.special === "castChar") {
    // 文字位置までヒット
    const fs = SPEAKER_FONT_SIZE;
    const charY = my - BODY_TOP;
    const ci = Math.max(0, Math.min(bestCol.chars.length, Math.round(charY / (fs + 3))));
    return { blockIndex: bestCol.blockIndex, field: "text", charIndex: ci, castIndex: bestCol.startCharIndex };
  }

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
  const isTg = block.type === "togaki";
  const tCharH = isTg ? (TOGAKI_FONT_SIZE + Math.round(TOGAKI_FONT_SIZE * 0.35)) : CHAR_H;
  const tIndent = isTg ? TOGAKI_INDENT_CHARS * CHAR_H : 0;
  const li = Math.min(Math.floor((my - BODY_TOP - tIndent) / tCharH), bestCol.chars.length);
  return { blockIndex: bestCol.blockIndex, field: bestCol.field, charIndex: bestCol.startCharIndex + Math.max(0, li) };
}

export function getMaxPage(cols: ColLayout[]): number {
  let max = 0;
  for (const col of cols) { if (col.page > max) max = col.page; }
  return max;
}
