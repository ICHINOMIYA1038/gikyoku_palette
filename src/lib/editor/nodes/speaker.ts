import { Node } from "@tiptap/core";

export const Speaker = Node.create({
  name: "speaker",
  group: "block",
  content: "inline*",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'p[data-type="speaker"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      {
        ...HTMLAttributes,
        "data-type": "speaker",
        class: "speaker",
      },
      0,
    ];
  },
});
