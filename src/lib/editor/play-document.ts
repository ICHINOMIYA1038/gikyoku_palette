/**
 * 戯曲エディタのデータモデル。
 * 台本の全構成要素を網羅し、組版設定もサポート。
 */

// ═══════════════════════════════════════
//  ブロック定義
// ═══════════════════════════════════════

/** タイトルブロック（1作品に1つ） */
export type TitleBlock = {
  type: "title";
  title: string;
  author: string;
};

/** 登場人物ブロック */
export type CastListBlock = {
  type: "castList";
  characters: { name: string; description: string }[];
};

/** 場面見出し（幕・場の区切り） */
export type SceneHeadingBlock = {
  type: "sceneHeading";
  text: string; // 例: "第一幕" "○公園（昼）"
};

/** セリフブロック */
export type SerifBlock = {
  type: "serif";
  speaker: string;
  direction?: string; // 感情指示: "おどけて" 等（括弧なしで格納）
  speech: string;
};

/** ト書き（舞台指示・動作・効果音） */
export type TogakiBlock = {
  type: "togaki";
  text: string; // 例: "沈黙。蝉の声が聞こえる。"
};

/** エンドマーク */
export type EndMarkBlock = {
  type: "endMark";
  text: string; // "おわり" "了" "幕" 等
};

export type Block =
  | TitleBlock
  | CastListBlock
  | SceneHeadingBlock
  | SerifBlock
  | TogakiBlock
  | EndMarkBlock;

// ═══════════════════════════════════════
//  組版設定
// ═══════════════════════════════════════

export type PaperSize = "b5" | "a4" | "custom";
export type FontFamily = "mincho" | "gothic";

export type TypesettingConfig = {
  paperSize: PaperSize;
  customWidth?: number; // mm（paperSize=custom時）
  customHeight?: number;
  orientation: "landscape" | "portrait";
  charsPerLine: number; // 1行あたり文字数（縦書き時は1列）
  linesPerPage: number; // 1ページあたり行数（縦書き時は列数）
  fontFamily: FontFamily;
  fontSize: number; // pt
  speakerFontSize: number; // pt
  marginTop: number; // mm
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  showHeader: boolean;
  headerText?: string; // 未指定時はタイトル+作者名を自動挿入
  showPageNumber: boolean;
  pageNumberPosition: "bottom-center" | "bottom-right";
};

export const DEFAULT_TYPESETTING: TypesettingConfig = {
  paperSize: "b5",
  orientation: "landscape",
  charsPerLine: 20,
  linesPerPage: 20,
  fontFamily: "mincho",
  fontSize: 12,
  speakerFontSize: 10,
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 25,
  marginRight: 15,
  showHeader: true,
  showPageNumber: true,
  pageNumberPosition: "bottom-center",
};

// ═══════════════════════════════════════
//  ドキュメント
// ═══════════════════════════════════════

export type PlayDocument = {
  blocks: Block[];
  typesetting?: TypesettingConfig;
};

export type CursorPosition = {
  blockIndex: number;
  field: "speaker" | "speech" | "text" | "direction" | "title" | "author";
  charIndex: number;
  /** castList編集時、何番目の人物名にいるか。未指定はラベル列。 */
  castIndex?: number;
};

export const EMPTY_DOC: PlayDocument = {
  blocks: [
    { type: "title", title: "", author: "" },
    { type: "castList", characters: [] },
    { type: "serif", speaker: "", speech: "" },
  ],
};

// ═══════════════════════════════════════
//  変換ユーティリティ
// ═══════════════════════════════════════

/** PlayDocument → bodyJson 互換形式に変換 */
export function toBodyJson(doc: PlayDocument): Record<string, unknown> {
  return {
    version: 2,
    blocks: doc.blocks,
    typesetting: doc.typesetting || DEFAULT_TYPESETTING,
  };
}

/** TipTap互換のノード（v1形式での後方互換用） */
type TipTapNode = {
  type?: string;
  text?: string;
  content?: TipTapNode[];
};

/** v2形式の bodyJson 構造（version=2 のとき） */
type BodyJsonV2 = {
  version?: number;
  blocks?: Block[];
  typesetting?: PlayDocument["typesetting"];
  content?: TipTapNode[];
};

/** bodyJson → PlayDocument に変換 */
export function fromBodyJson(
  json: Record<string, unknown> | null
): PlayDocument {
  if (!json) return EMPTY_DOC;

  const j = json as BodyJsonV2;

  // v2形式（新フォーマット）
  if (j.version === 2 && Array.isArray(j.blocks)) {
    return {
      blocks: j.blocks,
      typesetting: j.typesetting || DEFAULT_TYPESETTING,
    };
  }

  // v1形式（TipTap互換）— 後方互換
  if (Array.isArray(j.content)) {
    const blocks: Block[] = [];
    for (const node of j.content) {
      if (node.type === "serif") {
        const speaker = getNodeText(
          node.content?.find((c) => c.type === "speaker")
        );
        const speech = getNodeText(
          node.content?.find((c) => c.type === "speechContent")
        );
        blocks.push({ type: "serif", speaker, speech });
      } else if (node.type === "togaki") {
        blocks.push({ type: "togaki", text: getNodeText(node) });
      } else if (node.type === "sceneHeading") {
        blocks.push({ type: "sceneHeading", text: getNodeText(node) });
      }
    }
    return { blocks: blocks.length > 0 ? blocks : EMPTY_DOC.blocks };
  }

  return EMPTY_DOC;
}

function getNodeText(node: TipTapNode | undefined): string {
  if (!node) return "";
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(getNodeText).join("");
}

/** プレーンテキスト抽出（検索用） */
export function toPlainText(doc: PlayDocument): string {
  return doc.blocks
    .map((b) => {
      switch (b.type) {
        case "title":
          return `${b.title}\n${b.author}`;
        case "castList":
          return `登場人物\n${b.characters.map((c) => `${c.name}　${c.description}`).join("\n")}`;
        case "sceneHeading":
          return `【${b.text}】`;
        case "serif": {
          const dir = b.direction ? `（${b.direction}）` : "";
          return `${b.speaker}${dir}　${b.speech}`;
        }
        case "togaki":
          return `　（${b.text}）`;
        case "endMark":
          return b.text;
        default:
          return "";
      }
    })
    .join("\n");
}

/** ブロック種別の日本語ラベル */
export function blockLabel(type: Block["type"]): string {
  const labels: Record<Block["type"], string> = {
    title: "タイトル",
    castList: "登場人物",
    sceneHeading: "場面",
    serif: "セリフ",
    togaki: "ト書き",
    endMark: "終幕",
  };
  return labels[type];
}
