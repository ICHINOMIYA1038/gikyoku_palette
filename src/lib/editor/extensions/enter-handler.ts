import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import type { ResolvedPos, Node as PmNode } from "@tiptap/pm/model";

/**
 * 戯曲エディタ用のEnter/Backspaceキー制御。
 *
 * Enter:
 *   - speaker → 同じserifのspeechContentへ移動
 *   - speechContent → 新しいserifを追加し、そのspeakerへ移動
 *   - togaki → 新しいserifを追加
 *   - sceneHeading → 新しいserifを追加
 *
 * Backspace (カーソルが先頭 & 空のとき):
 *   - speechContent(空) → speakerへ戻る
 *   - speaker(空) & speechContent(空) → serif全体を削除
 *   - togaki(空) → 直前のノードへ移動して削除
 */
export const EnterHandler = Extension.create({
  name: "enterHandler",
  priority: 150, // StarterKitのデフォルトより高い優先度

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        // 現在のノードタイプを検出
        const nodeType = $from.parent.type.name;

        if (nodeType === "speaker") {
          // speaker → speechContent へ移動
          const serifNode = findAncestor($from, "serif");
          if (!serifNode) return false;

          const { node, pos } = serifNode;
          // speechContent は serif の2番目の子
          if (node.childCount >= 2) {
            const speechContentPos = pos + 1 + node.child(0).nodeSize;
            const tr = state.tr.setSelection(
              TextSelection.create(state.doc, speechContentPos + 1)
            );
            editor.view.dispatch(tr);
            return true;
          }
          return false;
        }

        if (nodeType === "speechContent") {
          // speechContent → 新しい serif を挿入
          const serifNode = findAncestor($from, "serif");
          if (!serifNode) return false;

          const afterSerif = serifNode.pos + serifNode.node.nodeSize;
          const newSerif = state.schema.nodes.serif.create(null, [
            state.schema.nodes.speaker.create(),
            state.schema.nodes.speechContent.create(),
          ]);

          const tr = state.tr.insert(afterSerif, newSerif);
          // 新しいserifのspeaker内にカーソルを置く
          tr.setSelection(TextSelection.create(tr.doc, afterSerif + 2));
          editor.view.dispatch(tr);
          return true;
        }

        if (nodeType === "togaki" || nodeType === "sceneHeading") {
          // togaki/sceneHeading → 新しい serif を挿入
          const nodePos = findNodePos($from, nodeType);
          if (nodePos === null) return false;

          const afterNode = nodePos + $from.parent.nodeSize;
          const newSerif = state.schema.nodes.serif.create(null, [
            state.schema.nodes.speaker.create(),
            state.schema.nodes.speechContent.create(),
          ]);

          const tr = state.tr.insert(afterNode, newSerif);
          tr.setSelection(TextSelection.create(tr.doc, afterNode + 2));
          editor.view.dispatch(tr);
          return true;
        }

        return false;
      },

      Backspace: ({ editor }) => {
        const { state } = editor;
        const { $from, empty } = state.selection;

        if (!empty) return false;
        if ($from.parentOffset !== 0) return false;

        const nodeType = $from.parent.type.name;

        if (nodeType === "speechContent" && $from.parent.content.size === 0) {
          // 空のspeechContent → speakerへ戻る
          const serifNode = findAncestor($from, "serif");
          if (!serifNode) return false;

          const speakerPos = serifNode.pos + 1;
          const speakerNode = serifNode.node.child(0);
          const tr = state.tr.setSelection(
            TextSelection.create(
              state.doc,
              speakerPos + speakerNode.content.size + 1
            )
          );
          editor.view.dispatch(tr);
          return true;
        }

        if (nodeType === "speaker" && $from.parent.content.size === 0) {
          // 空のspeaker → serifのspeechContentも空なら、serif全体を削除
          const serifNode = findAncestor($from, "serif");
          if (!serifNode) return false;

          const speechContent = serifNode.node.child(1);
          if (speechContent.content.size === 0) {
            const tr = state.tr.delete(
              serifNode.pos,
              serifNode.pos + serifNode.node.nodeSize
            );
            editor.view.dispatch(tr);
            return true;
          }
          return false;
        }

        if (nodeType === "togaki" && $from.parent.content.size === 0) {
          const nodePos = findNodePos($from, "togaki");
          if (nodePos === null) return false;

          const tr = state.tr.delete(
            nodePos,
            nodePos + $from.parent.nodeSize
          );
          editor.view.dispatch(tr);
          return true;
        }

        if (nodeType === "sceneHeading" && $from.parent.content.size === 0) {
          const nodePos = findNodePos($from, "sceneHeading");
          if (nodePos === null) return false;

          const tr = state.tr.delete(
            nodePos,
            nodePos + $from.parent.nodeSize
          );
          editor.view.dispatch(tr);
          return true;
        }

        return false;
      },

      "Shift-Enter": ({ editor }) => {
        return editor.commands.setHardBreak();
      },
    };
  },
});

function findAncestor(
  $pos: ResolvedPos,
  typeName: string
): { node: PmNode; pos: number } | null {
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === typeName) {
      return { node, pos: $pos.before(depth) };
    }
  }
  return null;
}

function findNodePos(
  $pos: ResolvedPos,
  typeName: string
): number | null {
  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.name === typeName) {
      return $pos.before(depth);
    }
  }
  return null;
}
