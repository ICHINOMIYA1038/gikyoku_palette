import { Node } from "@tiptap/core";

export const SpeechContent = Node.create({
  name: "speechContent",
  group: "block",
  content: "inline*",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'p[data-type="speech-content"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      {
        ...HTMLAttributes,
        "data-type": "speech-content",
        class: "speech-content",
      },
      0,
    ];
  },
});
