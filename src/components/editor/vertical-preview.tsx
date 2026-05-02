"use client";

import { useEffect, useRef, useCallback } from "react";

type TipTapNode = {
  type: string;
  content?: TipTapNode[];
  text?: string;
};

type Block =
  | { kind: "serif"; speaker: string; speech: string }
  | { kind: "togaki"; text: string }
  | { kind: "sceneHeading"; text: string };

/** TipTap JSONからブロック配列に変換 */
function parseDoc(doc: TipTapNode | null): Block[] {
  if (!doc?.content) return [];
  const blocks: Block[] = [];
  for (const node of doc.content) {
    if (node.type === "serif") {
      const speaker = getText(node.content?.find((c) => c.type === "speaker"));
      const speech = getText(
        node.content?.find((c) => c.type === "speechContent")
      );
      if (speaker || speech) blocks.push({ kind: "serif", speaker, speech });
    } else if (node.type === "togaki") {
      const text = getText(node);
      if (text) blocks.push({ kind: "togaki", text });
    } else if (node.type === "sceneHeading") {
      const text = getText(node);
      if (text) blocks.push({ kind: "sceneHeading", text });
    }
  }
  return blocks;
}

function getText(node?: TipTapNode): string {
  if (!node) return "";
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(getText).join("");
}

// レイアウト定数
const FONT_SIZE = 18;
const SPEAKER_FONT_SIZE = 14;
const LINE_HEIGHT = FONT_SIZE * 1.6;
const CHAR_HEIGHT = FONT_SIZE + 4;
const SPEAKER_CHAR_HEIGHT = SPEAKER_FONT_SIZE + 3;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 40;
const MARGIN_RIGHT = 40;
const LINE_GAP = 8;
const SPEAKER_GAP = 12; // 話者名とセリフの間
const SERIF_GAP = 24; // セリフ間の空行

const BODY_FONT = `${FONT_SIZE}px "Noto Serif JP", "游明朝", YuMincho, serif`;
const SPEAKER_FONT = `bold ${SPEAKER_FONT_SIZE}px "Noto Serif JP", "游明朝", YuMincho, serif`;
const HEADING_FONT = `bold ${FONT_SIZE}px "Noto Serif JP", "游明朝", YuMincho, serif`;

type Props = {
  doc: Record<string, unknown> | null;
  height: number;
};

export function VerticalPreview({ doc, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const blocks = parseDoc(doc as TipTapNode | null);

    const contentHeight = height - MARGIN_TOP - MARGIN_BOTTOM;
    if (contentHeight <= 0) return;

    // 1パス目: 必要な幅を計算
    let x = 0;
    let y = 0;

    const advanceColumn = () => {
      x += LINE_HEIGHT + LINE_GAP;
      y = 0;
    };

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      if (i > 0) {
        // セリフ間の空行
        y += SERIF_GAP;
        if (y > contentHeight) advanceColumn();
      }

      if (block.kind === "sceneHeading") {
        // 場面見出しは新しい列から
        if (y > 0) advanceColumn();
        for (const ch of block.text) {
          if (y + CHAR_HEIGHT > contentHeight) advanceColumn();
          y += CHAR_HEIGHT;
        }
        advanceColumn(); // 見出し後に列送り
      } else if (block.kind === "serif") {
        // 話者名
        for (const ch of block.speaker) {
          if (y + SPEAKER_CHAR_HEIGHT > contentHeight) advanceColumn();
          y += SPEAKER_CHAR_HEIGHT;
        }
        y += SPEAKER_GAP;

        // セリフ
        for (const ch of block.speech) {
          if (y + CHAR_HEIGHT > contentHeight) advanceColumn();
          y += CHAR_HEIGHT;
        }
      } else if (block.kind === "togaki") {
        y += FONT_SIZE; // 字下げ
        for (const ch of block.text) {
          if (y + CHAR_HEIGHT > contentHeight) advanceColumn();
          y += CHAR_HEIGHT;
        }
      }
    }

    const totalWidth = x + LINE_HEIGHT + MARGIN_RIGHT * 2;

    // Canvas サイズ設定
    canvas.width = totalWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // 背景クリア
    ctx.clearRect(0, 0, totalWidth, height);

    // 2パス目: 実際に描画（右から左）
    let drawX = totalWidth - MARGIN_RIGHT - FONT_SIZE;
    let drawY = MARGIN_TOP;

    const advanceDrawColumn = () => {
      drawX -= LINE_HEIGHT + LINE_GAP;
      drawY = MARGIN_TOP;
    };

    ctx.fillStyle = "#1a1a1a";
    ctx.textBaseline = "top";

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      if (i > 0) {
        drawY += SERIF_GAP;
        if (drawY - MARGIN_TOP > contentHeight) advanceDrawColumn();
      }

      if (block.kind === "sceneHeading") {
        if (drawY > MARGIN_TOP) advanceDrawColumn();
        ctx.font = HEADING_FONT;
        ctx.fillStyle = "#111";
        for (const ch of block.text) {
          if (drawY - MARGIN_TOP + CHAR_HEIGHT > contentHeight)
            advanceDrawColumn();
          ctx.fillText(ch, drawX, drawY);
          drawY += CHAR_HEIGHT;
        }
        // 見出しの下に線
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(drawX - 4, MARGIN_TOP);
        ctx.lineTo(drawX - 4, drawY);
        ctx.stroke();
        advanceDrawColumn();
        ctx.fillStyle = "#1a1a1a";
      } else if (block.kind === "serif") {
        // 話者名
        ctx.font = SPEAKER_FONT;
        ctx.fillStyle = "#111";
        for (const ch of block.speaker) {
          if (drawY - MARGIN_TOP + SPEAKER_CHAR_HEIGHT > contentHeight)
            advanceDrawColumn();
          // 話者名を列の中央寄せ（少し右にオフセット）
          const charW = ctx.measureText(ch).width;
          const offsetX = (FONT_SIZE - charW) / 2;
          ctx.fillText(ch, drawX + offsetX, drawY);
          drawY += SPEAKER_CHAR_HEIGHT;
        }

        drawY += SPEAKER_GAP;

        // セリフ
        ctx.font = BODY_FONT;
        ctx.fillStyle = "#1a1a1a";
        for (const ch of block.speech) {
          if (drawY - MARGIN_TOP + CHAR_HEIGHT > contentHeight)
            advanceDrawColumn();
          ctx.fillText(ch, drawX, drawY);
          drawY += CHAR_HEIGHT;
        }
      } else if (block.kind === "togaki") {
        ctx.font = BODY_FONT;
        ctx.fillStyle = "#666";
        drawY += FONT_SIZE; // 字下げ
        for (const ch of block.text) {
          if (drawY - MARGIN_TOP + CHAR_HEIGHT > contentHeight)
            advanceDrawColumn();
          ctx.fillText(ch, drawX, drawY);
          drawY += CHAR_HEIGHT;
        }
        ctx.fillStyle = "#1a1a1a";
      }
    }
  }, [doc, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  // フォント読み込み後に再描画
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.fonts.ready.then(() => draw());
  }, [draw]);

  return (
    <div className="vertical-preview" style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
