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

// mm → px 変換（96dpi基準）
const MM2PX = 96 / 25.4;
// pt → px
const PT2PX = 96 / 72;

export type ColLayout = {
  blockIndex: number;
  field: "speaker" | "speech" | "text" | "direction" | "title" | "author";
  x: number;
  chars: string;
  startCharIndex: number;
  page: number;
};

/** TypesettingConfig からピクセルベースのレイアウト値を計算 */
function resolveLayout(cfg: TypesettingConfig, canvasW: number, canvasH: number) {
  const fontSize = cfg.fontSize * PT2PX;
  const speakerFontSize = cfg.speakerFontSize * PT2PX;
  const charH = fontSize + Math.round(fontSize * 0.35);
  const colW = fontSize + Math.round(fontSize * 0.6);
  const marginTop = cfg.marginTop * MM2PX;
  const marginBottom = cfg.marginBottom * MM2PX;
  const marginLeft = cfg.marginLeft * MM2PX;
  const marginRight = cfg.marginRight * MM2PX;
  const speakerAreaH = speakerFontSize * 4 + 12;
  const headerH = cfg.showHeader ? 20 : 0;
  const sepY = marginTop + headerH + speakerAreaH;
  const bodyTop = sepY + 8;
  const bodyH = canvasH - marginBottom - bodyTop - (cfg.showPageNumber ? 24 : 0);
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

/** 列レイアウトを計算 */
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
      case "title": {
        // タイトルは1ページ目に描画（列ベースではなく特殊扱い）
        // 列として登録はしないがページ0を使う
        break;
      }
      case "castList":
      case "setting":
      case "endMark":
        // これらも特殊描画ブロック。列として1つ確保
        cols.push({ blockIndex: bi, field: "text", x, chars: "", startCharIndex: 0, page });
        nextCol();
        break;

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
  const titleFont = fontStr(L.fontSize * 1.4, cfg, true);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);

  // ヘッダー
  if (cfg.showHeader) {
    const titleBlock = doc.blocks.find((b) => b.type === "title") as any;
    const headerText = cfg.headerText || (titleBlock ? `『${titleBlock.title}』${titleBlock.author}` : "");
    if (headerText) {
      ctx.font = fontStr(10, cfg);
      ctx.fillStyle = "#888";
      ctx.textBaseline = "top";
      ctx.fillText(headerText, L.marginLeft, L.marginTop);
    }
  }

  // 区切り線
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(L.marginLeft, L.sepY);
  ctx.lineTo(w - L.marginRight, L.sepY);
  ctx.stroke();

  // ページ番号
  if (cfg.showPageNumber) {
    ctx.font = fontStr(10, cfg);
    ctx.fillStyle = "#888";
    ctx.textBaseline = "bottom";
    const pageNum = `${currentPage + 1}`;
    const pw = ctx.measureText(pageNum).width;
    if (cfg.pageNumberPosition === "bottom-center") {
      ctx.fillText(pageNum, (w - pw) / 2, h - 8);
    } else {
      ctx.fillText(pageNum, w - L.marginRight - pw, h - 8);
    }
  }

  // タイトルページ（page 0 のみ）
  if (currentPage === 0) {
    const titleBlock = doc.blocks.find((b) => b.type === "title") as any;
    if (titleBlock) {
      ctx.textBaseline = "top";
      // タイトル
      ctx.font = titleFont;
      ctx.fillStyle = "#111";
      const titleX = w - L.marginRight - L.colW / 2;
      for (let i = 0; i < (titleBlock.title || "").length; i++) {
        const ch = titleBlock.title[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, titleX - cw / 2, L.bodyTop + i * (L.fontSize * 1.4 + 6));
      }
      // 作者名
      ctx.font = fontStr(L.fontSize * 0.8, cfg);
      const authorX = titleX - L.colW * 1.5;
      for (let i = 0; i < (titleBlock.author || "").length; i++) {
        const ch = titleBlock.author[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, authorX - cw / 2, L.bodyTop + i * (L.fontSize * 0.8 + 4));
      }

      // タイトルカーソル
      if (cursor && doc.blocks[cursor.blockIndex]?.type === "title") {
        ctx.fillStyle = "#1a73e8";
        if (cursor.field === "title") {
          const cy = L.bodyTop + cursor.charIndex * (L.fontSize * 1.4 + 6);
          ctx.fillRect(titleX - L.fontSize * 0.7, cy, L.fontSize * 1.4 + 2, 3);
        } else if (cursor.field === "author") {
          const cy = L.bodyTop + cursor.charIndex * (L.fontSize * 0.8 + 4);
          ctx.fillRect(authorX - L.fontSize * 0.4, cy, L.fontSize * 0.8 + 2, 3);
        }
      }
    }

    // 登場人物
    const castBlock = doc.blocks.find((b) => b.type === "castList") as any;
    if (castBlock) {
      const castX = w - L.marginRight - L.colW * 4;
      ctx.font = fontStr(L.speakerFontSize, cfg, true);
      ctx.fillStyle = "#111";
      ctx.textBaseline = "top";
      const label = "登場人物";
      for (let i = 0; i < label.length; i++) {
        const ch = label[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, castX - cw / 2, L.sepY + 10 + i * (L.speakerFontSize + 4));
      }
      // キャラクターリスト
      ctx.font = fontStr(L.speakerFontSize * 0.9, cfg);
      for (let ci = 0; ci < castBlock.characters.length; ci++) {
        const { name } = castBlock.characters[ci];
        const cx = castX - L.colW * (ci + 1);
        for (let i = 0; i < name.length; i++) {
          const ch = name[i];
          const cw = ctx.measureText(ch).width;
          ctx.fillText(ch, cx - cw / 2, L.sepY + 10 + i * (L.speakerFontSize * 0.9 + 3));
        }
      }
    }
  }

  // 通常ブロック描画（現在のページの列のみ）
  ctx.textBaseline = "top";
  let prevBlockIndex = -1;

  for (const col of cols) {
    if (col.page !== currentPage) continue;

    const block = doc.blocks[col.blockIndex];
    if (!block) continue;
    const isFirstCol = col.blockIndex !== prevBlockIndex;
    prevBlockIndex = col.blockIndex;

    // 話者名（serifの最初の列のみ）
    if (isFirstCol && block.type === "serif") {
      ctx.font = speakerFont;
      ctx.fillStyle = "#111";
      const speaker = (block as any).speaker || "";
      for (let i = 0; i < speaker.length; i++) {
        const ch = speaker[i];
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, col.x - L.fontSize / 2 + (L.fontSize - cw) / 2,
          L.marginTop + L.headerH + i * (L.speakerFontSize + 4));
      }
      // 感情指示
      if ((block as any).direction) {
        ctx.font = fontStr(L.speakerFontSize * 0.85, cfg);
        ctx.fillStyle = "#666";
        const dir = `（${(block as any).direction}）`;
        const dirY = L.marginTop + L.headerH + speaker.length * (L.speakerFontSize + 4) + 4;
        for (let i = 0; i < dir.length; i++) {
          const ch = dir[i];
          const cw = ctx.measureText(ch).width;
          ctx.fillText(ch, col.x - L.fontSize / 2 + (L.fontSize - cw) / 2, dirY + i * (L.speakerFontSize * 0.85 + 2));
        }
      }

      // 話者名カーソル
      if (cursor && cursor.blockIndex === col.blockIndex && cursor.field === "speaker") {
        ctx.fillStyle = "#1a73e8";
        ctx.fillRect(col.x - L.fontSize / 2 - 1,
          L.marginTop + L.headerH + cursor.charIndex * (L.speakerFontSize + 4),
          L.fontSize + 2, 3);
      }
    }

    // セリフ / ト書き / テキスト描画
    ctx.font = bodyFont;
    ctx.fillStyle = block.type === "togaki" ? "#555" : "#1a1a1a";

    // ト書きは字下げ
    const indent = block.type === "togaki" ? Math.round(L.fontSize * 0.8) : 0;

    for (let i = 0; i < col.chars.length; i++) {
      const ch = col.chars[i];
      const cw = ctx.measureText(ch).width;
      ctx.fillText(ch, col.x - L.fontSize / 2 + (L.fontSize - cw) / 2,
        L.bodyTop + indent + i * L.charH);
    }

    // カーソル
    if (
      cursor &&
      cursor.blockIndex === col.blockIndex &&
      (cursor.field === "speech" || cursor.field === "text")
    ) {
      const localIdx = cursor.charIndex - col.startCharIndex;
      if (localIdx >= 0 && localIdx <= col.chars.length &&
        (localIdx < L.maxChars || col.chars.length < L.maxChars)) {
        ctx.fillStyle = "#1a73e8";
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
          Math.floor((my - L.marginTop - L.headerH) / (L.speakerFontSize + 4)),
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
    const indent = block?.type === "togaki" ? Math.round(L.fontSize * 0.8) : 0;
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

/** 最大ページ数を計算 */
export function getMaxPage(cols: ColLayout[]): number {
  let max = 0;
  for (const col of cols) {
    if (col.page > max) max = col.page;
  }
  return max;
}
