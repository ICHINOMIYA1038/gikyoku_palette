type TipTapNode = {
  type: string;
  content?: TipTapNode[];
  text?: string;
};

/**
 * TipTap JSONからプレーンテキストを抽出する。
 * 検索インデックス用 & テキストエクスポート用。
 */
export function extractTextFromJson(doc: TipTapNode): string {
  const lines: string[] = [];

  if (!doc.content) return "";

  for (const node of doc.content) {
    switch (node.type) {
      case "sceneHeading":
        lines.push("");
        lines.push(`【${getTextContent(node)}】`);
        lines.push("");
        break;

      case "serif": {
        const speaker = node.content?.find((c) => c.type === "speaker");
        const speech = node.content?.find((c) => c.type === "speechContent");
        const speakerText = speaker ? getTextContent(speaker) : "";
        const speechText = speech ? getTextContent(speech) : "";
        if (speakerText || speechText) {
          lines.push(`${speakerText}「${speechText}」`);
        }
        break;
      }

      case "togaki":
        lines.push(`　（${getTextContent(node)}）`);
        break;

      case "paragraph": {
        const text = getTextContent(node);
        if (text) lines.push(text);
        break;
      }
    }
  }

  return lines.join("\n");
}

function getTextContent(node: TipTapNode): string {
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(getTextContent).join("");
}
