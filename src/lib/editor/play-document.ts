/**
 * 戯曲エディタのデータモデル。
 * TipTap非依存。シンプルなブロック配列。
 */

export type SerifBlock = {
  type: "serif";
  speaker: string;
  speech: string;
};

export type TogakiBlock = {
  type: "togaki";
  text: string;
};

export type SceneHeadingBlock = {
  type: "sceneHeading";
  text: string;
};

export type Block = SerifBlock | TogakiBlock | SceneHeadingBlock;

export type PlayDocument = {
  blocks: Block[];
};

export type CursorPosition = {
  blockIndex: number;
  field: "speaker" | "speech" | "text";
  charIndex: number;
};

export const EMPTY_DOC: PlayDocument = {
  blocks: [{ type: "serif", speaker: "", speech: "" }],
};

/** PlayDocument → bodyJson 互換形式に変換 */
export function toBodyJson(doc: PlayDocument): Record<string, unknown> {
  return {
    type: "doc",
    content: doc.blocks.map((block) => {
      if (block.type === "serif") {
        return {
          type: "serif",
          content: [
            {
              type: "speaker",
              content: block.speaker
                ? [{ type: "text", text: block.speaker }]
                : [],
            },
            {
              type: "speechContent",
              content: block.speech
                ? [{ type: "text", text: block.speech }]
                : [],
            },
          ],
        };
      }
      if (block.type === "togaki") {
        return {
          type: "togaki",
          content: block.text ? [{ type: "text", text: block.text }] : [],
        };
      }
      return {
        type: "sceneHeading",
        content: block.text ? [{ type: "text", text: block.text }] : [],
      };
    }),
  };
}

/** bodyJson → PlayDocument に変換 */
export function fromBodyJson(
  json: Record<string, unknown> | null
): PlayDocument {
  if (!json || !Array.isArray((json as any).content)) return EMPTY_DOC;
  const blocks: Block[] = [];
  for (const node of (json as any).content) {
    if (node.type === "serif") {
      const speaker = getNodeText(node.content?.find((c: any) => c.type === "speaker"));
      const speech = getNodeText(node.content?.find((c: any) => c.type === "speechContent"));
      blocks.push({ type: "serif", speaker, speech });
    } else if (node.type === "togaki") {
      blocks.push({ type: "togaki", text: getNodeText(node) });
    } else if (node.type === "sceneHeading") {
      blocks.push({ type: "sceneHeading", text: getNodeText(node) });
    }
  }
  return { blocks: blocks.length > 0 ? blocks : EMPTY_DOC.blocks };
}

function getNodeText(node: any): string {
  if (!node) return "";
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(getNodeText).join("");
}

/** プレーンテキスト抽出（検索用） */
export function toPlainText(doc: PlayDocument): string {
  return doc.blocks
    .map((b) => {
      if (b.type === "serif") return `${b.speaker}　${b.speech}`;
      if (b.type === "togaki") return `　（${b.text}）`;
      return `【${b.text}】`;
    })
    .join("\n");
}
