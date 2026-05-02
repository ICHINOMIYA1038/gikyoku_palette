import { Node } from "@tiptap/core";

export const Togaki = Node.create({
  name: "togaki",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: 'p[data-type="togaki"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      {
        ...HTMLAttributes,
        "data-type": "togaki",
        class: "togaki",
      },
      0,
    ];
  },
});
