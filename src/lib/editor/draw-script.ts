/**
 * 台本（縦書き）モードのCanvas描画エンジン。
 * TypesettingConfigに基づいてピクセル精度で描画する。
 */
import {
  type PlayDocument,
  type CursorPosition,
  type Block,
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
};

function resolveLayout(cfg: TypesettingConfig, canvasW: number, canvasH: number) {
  const fontSize = cfg.fontSize * PT2PX;
  const speakerFontSize = cfg.speakerFontSize * PT2PX;
  const charH = fontSize + Math.round(fontSize * 0.35);
  const colW = fontSize + Math.round(fontSize * 0.75); // 列幅を広げた
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
  // タイトルページ用に右端に確保する列数
  const titleReservedCols = 5;

  return {
    fontSize, speakerFontSize, charH, colW,
    marginTop, marginBottom, marginLeft, marginRight,
    speakerAreaH, headerH, sepY, bodyTop, bodyH,
    maxChars, maxCols, titleReservedCols,
  };
}

function fontStr(size: number, cfg: TypesettingConfig, bold = false) {
  const family = cfg.fontFamily === "gothic"
    ? '"Noto Sans JP", "游ゴシック", sans-serif'
    : '"Noto Serif JP", "游明朝", serif';
  return `${bold ? "bold " : ""}${size}px ${family}`;
}

/** 列レイアウトを計算 */
export function computeColumns(
  doc: PlayDocument,
  canvasW: number,
  canvasH: number
): ColLayout[] {
  const cfg = doc.typesetting || DEFAULT_TYPESETTING;
  const L = resolveLayout(cfg, canvasW, canvasH);
  const cols: ColLayout[] = [];

  // ページ0ではタイトル領域を確保して、セリフ開始位置をずらす
  const hasTitlePage = doc.blocks.some((b) => b.type === "title");
  let x = canvasW - L.marginRight - L.colW / 2;
  if (hasTitlePage) {
    x -= L.colW * L.titleReservedCols; // タイトル分ずらす
  }
  let colsOnPage = hasTitlePage ? L.titleReservedCols : 0;
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

    // タイトル・キャスト・設定はページ0の右端領域に描画（列計算から除外）
    if (block.type === "title" || block.type === "castList") continue;

    if (block.type === "setting") {
      // 設定はト書きとして描画
      cols.push({ blockIndex: bi, field: "text", x, chars: block.text || "", startCharIndex: 0, page });
      nextCol();
      continue;
    }

    if (block.type === "endMark") {
      cols.push({ blockIndex: bi, field: "text", x, chars: block.text || "", startCharIndex: 0, page });
      nextCol();
      continue;
    }

    if (block.type === "sceneHeading") {
      // 場面は前後に空列を入れる
      if (colsOnPage > (hasTitlePage && page === 0 ? L.titleReservedCols : 0)) {
        nextCol(); // 前に1列空ける
      }
      cols.push({ blockIndex: bi, field: "text", x, chars: block.text || "", startCharIndex: 0, page });
      nextCol();
      nextCol(); // 後ろにも1列空ける
      continue;
    }

    if (block.type === "togaki") {
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
      continue;
    }

    if (block.type === "serif") {
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
  const titleFont = fontStr(L.fontSize * 1.6, cfg, true);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);

  // ─── ヘッダー ───
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

  // ─── 区切り線 ───
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 1;
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

  // ─── タイトルページ（page 0 右端領域） ───
  if (currentPage === 0) {
    const titleBlock = doc.blocks.find((b) => b.type === "title") as any;
    const castBlock = doc.blocks.find((b) => b.type === "castList") as any;
    const titleX = w - L.marginRight - L.colW * 0.5;

    ctx.textBaseline = "top";

    if (titleBlock) {
      // タイトル（大きく）
      ctx.font = titleFont;
      ctx.fillStyle = "#111";
      const title = titleBlock.title || "";
      for (let i = 0; i < title.length; i++) {
        const ch = title[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, titleX - cw / 2, L.bodyTop + i * (L.fontSize * 1.6 + 8));
      }

      // 作者名（タイトルの左1列）
      ctx.font = fontStr(L.fontSize * 0.7, cfg);
      ctx.fillStyle = "#555";
      const authorX = titleX - L.colW * 1.5;
      const author = titleBlock.author || "";
      for (let i = 0; i < author.length; i++) {
        const ch = author[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, authorX - cw / 2, L.bodyTop + 8 + i * (L.fontSize * 0.7 + 4));
      }

      // タイトルカーソル
      if (cursor && doc.blocks[cursor.blockIndex]?.type === "title") {
        ctx.fillStyle = "#3b82f6";
        if (cursor.field === "title") {
          const cy = L.bodyTop + cursor.charIndex * (L.fontSize * 1.6 + 8);
          ctx.fillRect(titleX - L.fontSize * 0.8, cy, L.fontSize * 1.6 + 2, 3);
        } else if (cursor.field === "author") {
          const cy = L.bodyTop + 8 + cursor.charIndex * (L.fontSize * 0.7 + 4);
          ctx.fillRect(authorX - L.fontSize * 0.35, cy, L.fontSize * 0.7 + 2, 3);
        }
      }
    }

    // 登場人物（タイトルの左2列目から）
    if (castBlock && castBlock.characters.length > 0) {
      const castLabelX = titleX - L.colW * 2.5;

      // 「登場人物」ラベル
      ctx.font = fontStr(L.speakerFontSize * 0.85, cfg, true);
      ctx.fillStyle = "#888";
      const label = "登場人物";
      for (let i = 0; i < label.length; i++) {
        const ch = label[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, castLabelX - cw / 2, L.bodyTop + i * (L.speakerFontSize + 3));
      }

      // キャラクター名
      ctx.font = fontStr(L.speakerFontSize, cfg);
      ctx.fillStyle = "#333";
      for (let ci = 0; ci < castBlock.characters.length; ci++) {
        const { name } = castBlock.characters[ci];
        const cx = castLabelX - L.colW * (ci + 1);
        for (let i = 0; i < name.length; i++) {
          const ch = name[i];
          const cw = ctx.measureText(ch).width;
          ctx.fillText(ch, cx - cw / 2, L.bodyTop + i * (L.speakerFontSize + 3));
        }
      }
    }

    // タイトル領域の区切り線（縦）
    const titleBorderX = titleX - L.colW * L.titleReservedCols + L.colW * 0.3;
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(titleBorderX, L.sepY + 4);
    ctx.lineTo(titleBorderX, h - L.marginBottom - 30);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ─── 通常ブロック描画 ───
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
      ctx.fillStyle = "rgba(59, 130, 246, 0.07)";
      ctx.fillRect(col.x - L.colW / 2, L.marginTop + L.headerH, L.colW, h - L.marginTop - L.headerH - L.marginBottom);
    }

    // ─── 話者名 ───
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

      // 感情指示
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

      // 話者名カーソル
      if (isActive && cursor?.field === "speaker") {
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(col.x - L.fontSize / 2 - 1,
          L.marginTop + L.headerH + 4 + cursor.charIndex * (L.speakerFontSize + 5),
          L.fontSize + 2, 3);
      }
    }

    // ─── ト書きラベル ───
    if (isFirstCol && block.type === "togaki") {
      ctx.font = fontStr(L.speakerFontSize * 0.7, cfg);
      ctx.fillStyle = "#bbb";
      const label = "ト書";
      for (let i = 0; i < label.length; i++) {
        const ch = label[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - L.fontSize / 2 + (L.fontSize - cw) / 2,
          L.marginTop + L.headerH + 4 + i * (L.speakerFontSize * 0.7 + 2));
      }
    }

    // ─── テキスト描画 ───
    ctx.font = bodyFont;
    ctx.fillStyle = block.type === "togaki" ? "#555" : "#1a1a1a";

    const indent = block.type === "togaki" ? Math.round(L.fontSize * 0.6) : 0;

    for (let i = 0; i < col.chars.length; i++) {
      const ch = col.chars[i];
      const cw = ctx.measureText(ch).width;
      ctx.fillText(ch, col.x - L.fontSize / 2 + (L.fontSize - cw) / 2,
        L.bodyTop + indent + i * L.charH);
    }

    // ─── カーソル ───
    if (isActive && (cursor?.field === "speech" || cursor?.field === "text")) {
      const localIdx = cursor.charIndex - col.startCharIndex;
      if (localIdx >= 0 && localIdx <= col.chars.length && (localIdx < L.maxChars || col.chars.length < L.maxChars)) {
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(col.x - L.fontSize / 2 - 1,
          L.bodyTop + indent + localIdx * L.charH,
          L.fontSize + 2, 3);
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

  // タイトル領域のクリック（ページ0のみ）
  if (currentPage === 0) {
    const titleX = w - L.marginRight - L.colW * 0.5;
    const titleBorderX = titleX - L.colW * L.titleReservedCols + L.colW * 0.3;

    if (mx > titleBorderX) {
      const titleIdx = doc.blocks.findIndex((b) => b.type === "title");
      if (titleIdx >= 0) {
        if (mx > titleX - L.colW * 0.8) {
          return { blockIndex: titleIdx, field: "title", charIndex: (doc.blocks[titleIdx] as any).title.length };
        } else {
          return { blockIndex: titleIdx, field: "author", charIndex: (doc.blocks[titleIdx] as any).author.length };
        }
      }
    }
  }

  // 話者名エリア
  if (my < L.sepY) {
    let bestCol: ColLayout | null = null;
    let bestDist = Infinity;
    let prevBI = -1;
    for (const col of cols) {
      if (col.page !== currentPage) continue;
      if (col.blockIndex !== prevBI) {
        const dist = Math.abs(mx - col.x);
        if (dist < bestDist) { bestDist = dist; bestCol = col; }
        prevBI = col.blockIndex;
      }
    }
    if (bestCol) {
      const block = doc.blocks[bestCol.blockIndex];
      if (block?.type === "serif") {
        const speaker = block.speaker || "";
        const charIdx = Math.min(
          Math.floor((my - L.marginTop - L.headerH - 4) / (L.speakerFontSize + 5)),
          speaker.length
        );
        return { blockIndex: bestCol.blockIndex, field: "speaker", charIndex: Math.max(0, charIdx) };
      }
    }
  }

  // セリフエリア
  let bestCol: ColLayout | null = null;
  let bestDist = Infinity;
  for (const col of cols) {
    if (col.page !== currentPage) continue;
    const dist = Math.abs(mx - col.x);
    if (dist < bestDist) { bestDist = dist; bestCol = col; }
  }
  if (bestCol) {
    const block = doc.blocks[bestCol.blockIndex];
    const indent = block?.type === "togaki" ? Math.round(L.fontSize * 0.6) : 0;
    const charInCol = Math.min(
      Math.floor((my - L.bodyTop - indent) / L.charH),
      bestCol.chars.length
    );
    return {
      blockIndex: bestCol.blockIndex,
      field: bestCol.field as "speech" | "text",
      charIndex: bestCol.startCharIndex + Math.max(0, charInCol),
    };
  }

  return null;
}

/** 最大ページ数 */
export function getMaxPage(cols: ColLayout[]): number {
  let max = 0;
  for (const col of cols) {
    if (col.page > max) max = col.page;
  }
  return max;
}
