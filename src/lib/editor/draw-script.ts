/**
 * 台本（縦書き）モードのCanvas描画エンジン。
 * 参考: 『骨壷』いちのみや（劇団かたかご）の台本レイアウトを再現。
 * 全ブロックが同一の列フローで流れる。タイトル・登場人物も列として扱う。
 */
import {
  type PlayDocument,
  type CursorPosition,
  type TypesettingConfig,
  DEFAULT_TYPESETTING,
} from "./play-document";

const MM2PX = 96 / 25.4;
const PT2PX = 96 / 72;

export type ColLayout = {
  blockIndex: number;
  field: "speaker" | "speech" | "text" | "direction" | "title" | "author";
  x: number;
  chars: string;
  startCharIndex: number;
  page: number;
  /** タイトルページの特殊列（タイトル/作者/キャストラベル/キャラ名） */
  special?: "title" | "author" | "castLabel" | "castChar";
};

function resolveLayout(cfg: TypesettingConfig, canvasW: number, canvasH: number) {
  const fontSize = cfg.fontSize * PT2PX;
  const speakerFontSize = cfg.speakerFontSize * PT2PX;
  const charH = fontSize + Math.round(fontSize * 0.35);
  const colW = fontSize + Math.round(fontSize * 0.85);
  const marginTop = cfg.marginTop * MM2PX;
  const marginBottom = cfg.marginBottom * MM2PX;
  const marginLeft = cfg.marginLeft * MM2PX;
  const marginRight = cfg.marginRight * MM2PX;
  const speakerAreaH = speakerFontSize * 4 + 16;
  const headerH = cfg.showHeader ? 24 : 0;
  const sepY = marginTop + headerH + speakerAreaH;
  const bodyTop = sepY + 10;
  const bodyH = canvasH - marginBottom - bodyTop - (cfg.showPageNumber ? 28 : 0);
  const maxChars = Math.max(1, Math.floor(bodyH / charH));
  const maxCols = Math.max(1, Math.floor((canvasW - marginLeft - marginRight) / colW));

  return {
    fontSize, speakerFontSize, charH, colW,
    marginTop, marginBottom, marginLeft, marginRight,
    speakerAreaH, headerH, sepY, bodyTop, bodyH,
    maxChars, maxCols,
  };
}

function fontStr(size: number, cfg: TypesettingConfig, bold = false) {
  const family = cfg.fontFamily === "gothic"
    ? '"Noto Sans JP", "游ゴシック", sans-serif'
    : '"Noto Serif JP", "游明朝", serif';
  return `${bold ? "bold " : ""}${size}px ${family}`;
}

/** 列レイアウト計算 — 全ブロックが同一フローで流れる */
export function computeColumns(
  doc: PlayDocument,
  canvasW: number,
  canvasH: number
): ColLayout[] {
  const cfg = doc.typesetting || DEFAULT_TYPESETTING;
  const L = resolveLayout(cfg, canvasW, canvasH);
  const cols: ColLayout[] = [];
  let x = canvasW - L.marginRight - L.colW / 2;
  let colsOnPage = 0;
  let page = 0;

  const nextCol = () => {
    x -= L.colW;
    colsOnPage++;
    if (colsOnPage >= L.maxCols) {
      page++;
      colsOnPage = 0;
      x = canvasW - L.marginRight - L.colW / 2;
    }
  };

  for (let bi = 0; bi < doc.blocks.length; bi++) {
    const block = doc.blocks[bi];

    switch (block.type) {
      case "title":
        // タイトル: 1列
        cols.push({ blockIndex: bi, field: "title", x, chars: block.title || "", startCharIndex: 0, page, special: "title" });
        nextCol();
        // 作者: 1列
        cols.push({ blockIndex: bi, field: "author", x, chars: block.author || "", startCharIndex: 0, page, special: "author" });
        nextCol();
        break;

      case "castList":
        // 「登場人物」ラベル: 1列
        cols.push({ blockIndex: bi, field: "text", x, chars: "登場人物", startCharIndex: 0, page, special: "castLabel" });
        nextCol();
        // 各キャラクター名: 各1列
        for (let ci = 0; ci < block.characters.length; ci++) {
          cols.push({ blockIndex: bi, field: "text", x, chars: block.characters[ci].name, startCharIndex: ci, page, special: "castChar" });
          nextCol();
        }
        break;

      case "setting": {
        const text = block.text || "";
        for (let i = 0; i < Math.max(1, text.length); i += L.maxChars) {
          cols.push({ blockIndex: bi, field: "text", x, chars: text.slice(i, i + L.maxChars), startCharIndex: i, page });
          nextCol();
        }
        break;
      }

      case "sceneHeading":
        cols.push({ blockIndex: bi, field: "text", x, chars: block.text || "", startCharIndex: 0, page });
        nextCol();
        break;

      case "togaki": {
        const text = block.text || "";
        if (text.length === 0) {
          cols.push({ blockIndex: bi, field: "text", x, chars: "", startCharIndex: 0, page });
          nextCol();
        } else {
          for (let i = 0; i < text.length; i += L.maxChars) {
            cols.push({ blockIndex: bi, field: "text", x, chars: text.slice(i, i + L.maxChars), startCharIndex: i, page });
            nextCol();
          }
        }
        break;
      }

      case "serif": {
        const speech = block.speech || "";
        if (speech.length === 0) {
          cols.push({ blockIndex: bi, field: "speech", x, chars: "", startCharIndex: 0, page });
          nextCol();
        } else {
          for (let i = 0; i < speech.length; i += L.maxChars) {
            cols.push({ blockIndex: bi, field: "speech", x, chars: speech.slice(i, i + L.maxChars), startCharIndex: i, page });
            nextCol();
          }
        }
        break;
      }

      case "endMark":
        cols.push({ blockIndex: bi, field: "text", x, chars: block.text || "おわり", startCharIndex: 0, page });
        nextCol();
        break;
    }
  }

  return cols;
}

/** 台本モード描画 */
export function drawScript(
  ctx: CanvasRenderingContext2D,
  doc: PlayDocument,
  cols: ColLayout[],
  cursor: CursorPosition | null,
  w: number,
  h: number,
  currentPage: number
) {
  const cfg = doc.typesetting || DEFAULT_TYPESETTING;
  const L = resolveLayout(cfg, w, h);
  const bodyFont = fontStr(L.fontSize, cfg);
  const speakerFont = fontStr(L.speakerFontSize, cfg, true);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);

  // ─── ヘッダー（横書き、左上） ───
  if (cfg.showHeader) {
    const titleBlock = doc.blocks.find((b) => b.type === "title") as any;
    const headerText = cfg.headerText || (titleBlock ? `『${titleBlock.title}』${titleBlock.author}` : "");
    if (headerText) {
      ctx.font = fontStr(13, cfg);
      ctx.fillStyle = "#777";
      ctx.textBaseline = "top";
      ctx.fillText(headerText, L.marginLeft, L.marginTop + 2);
    }
  }

  // ─── 区切り線（話者名エリアとセリフエリアの境界） ───
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(L.marginLeft, L.sepY);
  ctx.lineTo(w - L.marginRight, L.sepY);
  ctx.stroke();

  // ─── ページ番号 ───
  if (cfg.showPageNumber) {
    ctx.font = fontStr(12, cfg);
    ctx.fillStyle = "#999";
    ctx.textBaseline = "bottom";
    const pageNum = `${currentPage + 1}`;
    const pw = ctx.measureText(pageNum).width;
    ctx.fillText(pageNum, (w - pw) / 2, h - 10);
  }

  // ─── 列描画 ───
  ctx.textBaseline = "top";
  let prevBlockIndex = -1;

  for (const col of cols) {
    if (col.page !== currentPage) continue;

    const block = doc.blocks[col.blockIndex];
    if (!block) continue;
    const isFirstCol = col.blockIndex !== prevBlockIndex;
    prevBlockIndex = col.blockIndex;
    const isActive = cursor?.blockIndex === col.blockIndex;

    // アクティブ列ハイライト
    if (isActive) {
      ctx.fillStyle = "rgba(59, 130, 246, 0.06)";
      ctx.fillRect(col.x - L.colW / 2, L.marginTop + L.headerH, L.colW, h - L.marginTop - L.headerH - L.marginBottom);
    }

    // ─── 特殊列（タイトルページ要素） ───
    if (col.special === "title") {
      ctx.font = fontStr(L.fontSize * 1.5, cfg, true);
      ctx.fillStyle = "#111";
      for (let i = 0; i < col.chars.length; i++) {
        const ch = col.chars[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - cw / 2, L.bodyTop + i * (L.fontSize * 1.5 + 8));
      }
      // カーソル
      if (isActive && cursor?.field === "title") {
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(col.x - L.fontSize * 0.75, L.bodyTop + cursor.charIndex * (L.fontSize * 1.5 + 8), L.fontSize * 1.5 + 2, 3);
      }
      continue;
    }

    if (col.special === "author") {
      ctx.font = fontStr(L.fontSize * 0.7, cfg);
      ctx.fillStyle = "#555";
      // 作者名はタイトルより少し下から開始
      const offsetY = L.fontSize * 2;
      for (let i = 0; i < col.chars.length; i++) {
        const ch = col.chars[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - cw / 2, L.bodyTop + offsetY + i * (L.fontSize * 0.7 + 4));
      }
      if (isActive && cursor?.field === "author") {
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(col.x - L.fontSize * 0.35, L.bodyTop + offsetY + cursor.charIndex * (L.fontSize * 0.7 + 4), L.fontSize * 0.7 + 2, 3);
      }
      continue;
    }

    if (col.special === "castLabel") {
      ctx.font = fontStr(L.speakerFontSize, cfg);
      ctx.fillStyle = "#555";
      for (let i = 0; i < col.chars.length; i++) {
        const ch = col.chars[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - cw / 2, L.bodyTop + i * (L.speakerFontSize + 4));
      }
      continue;
    }

    if (col.special === "castChar") {
      ctx.font = fontStr(L.speakerFontSize, cfg);
      ctx.fillStyle = "#333";
      for (let i = 0; i < col.chars.length; i++) {
        const ch = col.chars[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - cw / 2, L.bodyTop + i * (L.speakerFontSize + 4));
      }
      continue;
    }

    // ─── 話者名（serifの最初の列のみ） ───
    if (isFirstCol && block.type === "serif") {
      ctx.font = speakerFont;
      ctx.fillStyle = "#222";
      const speaker = block.speaker || "";
      for (let i = 0; i < speaker.length; i++) {
        const ch = speaker[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - L.fontSize / 2 + (L.fontSize - cw) / 2,
          L.marginTop + L.headerH + 4 + i * (L.speakerFontSize + 5));
      }

      if ((block as any).direction) {
        ctx.font = fontStr(L.speakerFontSize * 0.8, cfg);
        ctx.fillStyle = "#999";
        const dir = `（${(block as any).direction}）`;
        const dirY = L.marginTop + L.headerH + 4 + speaker.length * (L.speakerFontSize + 5) + 4;
        for (let i = 0; i < dir.length; i++) {
          const ch = dir[i];
          const cw = ctx.measureText(ch).width;
          ctx.fillText(ch, col.x - L.fontSize / 2 + (L.fontSize - cw) / 2, dirY + i * (L.speakerFontSize * 0.8 + 2));
        }
      }

      if (isActive && cursor?.field === "speaker") {
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(col.x - L.fontSize / 2 - 1,
          L.marginTop + L.headerH + 4 + cursor.charIndex * (L.speakerFontSize + 5),
          L.fontSize + 2, 3);
      }
    }

    // ─── 本文テキスト ───
    ctx.font = bodyFont;
    ctx.fillStyle = block.type === "togaki" || block.type === "setting" ? "#333" : "#1a1a1a";

    for (let i = 0; i < col.chars.length; i++) {
      const ch = col.chars[i];
      const cw = ctx.measureText(ch).width;
      ctx.fillText(ch, col.x - L.fontSize / 2 + (L.fontSize - cw) / 2, L.bodyTop + i * L.charH);
    }

    // ─── カーソル ───
    if (isActive && (cursor?.field === "speech" || cursor?.field === "text")) {
      const localIdx = cursor.charIndex - col.startCharIndex;
      if (localIdx >= 0 && localIdx <= col.chars.length && (localIdx < L.maxChars || col.chars.length < L.maxChars)) {
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(col.x - L.fontSize / 2 - 1, L.bodyTop + localIdx * L.charH, L.fontSize + 2, 3);
      }
    }
  }
}

/** クリック → カーソル位置 */
export function hitTestScript(
  doc: PlayDocument,
  cols: ColLayout[],
  mx: number,
  my: number,
  w: number,
  h: number,
  currentPage: number
): CursorPosition | null {
  const cfg = doc.typesetting || DEFAULT_TYPESETTING;
  const L = resolveLayout(cfg, w, h);

  // 最も近い列を見つける
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

  // 特殊列
  if (bestCol.special === "title") {
    return { blockIndex: bestCol.blockIndex, field: "title", charIndex: bestCol.chars.length };
  }
  if (bestCol.special === "author") {
    return { blockIndex: bestCol.blockIndex, field: "author", charIndex: bestCol.chars.length };
  }
  if (bestCol.special === "castLabel" || bestCol.special === "castChar") {
    return null; // キャストリストは直接編集不可（後で専用UI）
  }

  // 話者名エリア
  if (my < L.sepY && block.type === "serif") {
    const speaker = block.speaker || "";
    const charIdx = Math.min(
      Math.floor((my - L.marginTop - L.headerH - 4) / (L.speakerFontSize + 5)),
      speaker.length
    );
    return { blockIndex: bestCol.blockIndex, field: "speaker", charIndex: Math.max(0, charIdx) };
  }

  // セリフ/テキストエリア
  const charInCol = Math.min(
    Math.floor((my - L.bodyTop) / L.charH),
    bestCol.chars.length
  );
  return {
    blockIndex: bestCol.blockIndex,
    field: bestCol.field as "speech" | "text",
    charIndex: bestCol.startCharIndex + Math.max(0, charInCol),
  };
}

/** 最大ページ数 */
export function getMaxPage(cols: ColLayout[]): number {
  let max = 0;
  for (const col of cols) {
    if (col.page > max) max = col.page;
  }
  return max;
}
