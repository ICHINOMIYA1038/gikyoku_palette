import { Node } from "@tiptap/core";

export const SceneHeading = Node.create({
  name: "sceneHeading",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: 'h3[data-type="scene-heading"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "h3",
      {
        ...HTMLAttributes,
        "data-type": "scene-heading",
        class: "scene-heading",
      },
      0,
    ];
  },
});
