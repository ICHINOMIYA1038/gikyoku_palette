import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import HardBreak from "@tiptap/extension-hard-break";
import { Serif } from "./nodes/serif";
import { Speaker } from "./nodes/speaker";
import { SpeechContent } from "./nodes/speech-content";
import { Togaki } from "./nodes/togaki";
import { SceneHeading } from "./nodes/scene-heading";
import { EnterHandler } from "./extensions/enter-handler";

export function createEditorExtensions() {
  return [
    StarterKit.configure({
      // カスタムノードと衝突する機能を無効化
      heading: false,
      blockquote: false,
      codeBlock: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      horizontalRule: false,
      hardBreak: false,
    }),
    HardBreak,
    Serif,
    Speaker,
    SpeechContent,
    Togaki,
    SceneHeading,
    EnterHandler,
    Placeholder.configure({
      showOnlyCurrent: true,
      includeChildren: true,
      placeholder: ({ node }) => {
        switch (node.type.name) {
          case "speaker":
            return "話者名";
          case "speechContent":
            return "セリフ";
          case "togaki":
            return "ト書き";
          case "sceneHeading":
            return "場面";
          case "paragraph":
            return "/ でブロック挿入…";
          default:
            return "";
        }
      },
    }),
  ];
}

export const EMPTY_DOCUMENT = {
  type: "doc",
  content: [
    {
      type: "serif",
      content: [
        { type: "speaker" },
        { type: "speechContent" },
      ],
    },
  ],
};
