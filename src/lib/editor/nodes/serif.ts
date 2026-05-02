import { Node } from "@tiptap/core";

export const Serif = Node.create({
  name: "serif",
  group: "block",
  content: "speaker speechContent",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="serif"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        ...HTMLAttributes,
        "data-type": "serif",
        class: "serif",
      },
      0,
    ];
  },
});
