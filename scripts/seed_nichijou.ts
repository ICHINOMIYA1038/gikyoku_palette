/**
 * 「日常」サンプルを新規playとしてDBにインポート（エディタ動作確認用）
 */
import { config } from "dotenv";
config({ path: ".env.development.local" });
import { prisma } from "../src/lib/db";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Block =
  | { type: "title"; title: string; author: string }
  | { type: "castList"; characters: { name: string; description: string }[] }
  | { type: "sceneHeading"; text: string }
  | { type: "setting"; text: string }
  | { type: "serif"; speaker: string; speech: string }
  | { type: "togaki"; text: string }
  | { type: "endMark"; text: string };

function parseMarkdownPlay(md: string): { title: string; blocks: Block[] } {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let title = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
      title = trimmed.replace(/^#\s+/, "").trim();
      blocks.push({ type: "title", title, author: "" });
      i++;
      continue;
    }

    if (trimmed === "## 登場人物") {
      i++;
      const characters: { name: string; description: string }[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("## ") && lines[i].trim() !== "---") {
        const m = lines[i].trim().match(/^[-・]\s*(.+)$/);
        if (m) {
          const full = m[1];
          const nm = full.match(/^([^（(]+)[（(](.+)[)）]\s*$/);
          if (nm) characters.push({ name: nm[1].trim(), description: nm[2].trim() });
          else characters.push({ name: full.trim(), description: "" });
        }
        i++;
      }
      blocks.push({ type: "castList", characters });
      continue;
    }

    if (trimmed === "## 場所") {
      i++;
      const buf: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("## ") && lines[i].trim() !== "---") {
        if (lines[i].trim()) buf.push(lines[i].trim());
        i++;
      }
      if (buf.length) blocks.push({ type: "setting", text: buf.join("\n") });
      continue;
    }

    if (trimmed.startsWith("## 第") || trimmed.startsWith("## ")) {
      const heading = trimmed.replace(/^##\s+/, "").trim();
      blocks.push({ type: "sceneHeading", text: heading });
      i++;
      continue;
    }

    if (trimmed === "---" || trimmed === "") {
      i++;
      continue;
    }

    if (trimmed === "幕。") {
      blocks.push({ type: "endMark", text: "幕。" });
      i++;
      continue;
    }

    // セリフ判定: 「名前」「内容」パターン
    const serif = trimmed.match(/^([^「]+?)「(.+)」$/);
    if (serif) {
      blocks.push({ type: "serif", speaker: serif[1].trim(), speech: serif[2] });
      i++;
      continue;
    }

    // それ以外はト書き（複数行をパラグラフとしてまとめる）
    const buf: string[] = [trimmed];
    let j = i + 1;
    while (j < lines.length) {
      const t = lines[j].trim();
      if (t === "" || t.startsWith("##") || t === "---" || t === "幕。" || t.match(/^([^「]+?)「(.+)」$/)) break;
      buf.push(t);
      j++;
    }
    blocks.push({ type: "togaki", text: buf.join("\n") });
    i = j;
  }

  return { title, blocks };
}

async function main() {
  const mdPath = process.argv[2] || join(process.cwd(), "src/lib/editor/samples/nichijou_full.md");
  const md = readFileSync(mdPath, "utf-8");
  const parsed = parseMarkdownPlay(md);
  console.log(`Parsed ${parsed.blocks.length} blocks for "${parsed.title}"`);
  console.log("Block counts:", parsed.blocks.reduce((acc: any, b) => { acc[b.type] = (acc[b.type] || 0) + 1; return acc; }, {}));

  const authorId = process.argv[3];
  if (!authorId) {
    const users = await prisma.user.findMany({ select: { id: true, email: true }, take: 5 });
    console.log("\nUsage: npx tsx scripts/seed_nichijou.ts <markdown_path> <authorId>");
    console.log("Available users:");
    for (const u of users) console.log(`  ${u.id}  ${u.email}`);
    return;
  }

  const bodyJson = {
    version: 2,
    blocks: parsed.blocks,
  };

  const plainText = parsed.blocks.map((b: any) => {
    switch (b.type) {
      case "title": return `${b.title}\n${b.author}`;
      case "castList": return `登場人物\n${b.characters.map((c: any) => `${c.name}　${c.description}`).join("\n")}`;
      case "setting": return b.text;
      case "sceneHeading": return `【${b.text}】`;
      case "serif": return `${b.speaker}「${b.speech}」`;
      case "togaki": return b.text;
      case "endMark": return b.text;
      default: return "";
    }
  }).join("\n\n");

  const play = await prisma.palettePlay.create({
    data: {
      title: parsed.title || "日常",
      synopsis: "ある家のリビングの朝。長女・長男・次女・母・赤ちゃんが交錯する家族劇。",
      body: plainText,
      bodyJson: bodyJson as any,
      bodyType: "editor",
      bodyOrientation: "portrait",
      readingDirection: "ltr",
      durationMinutes: 30,
      castTotal: 5,
      castMale: 1,
      castFemale: 4,
      castOther: 0,
      feeAmount: 0,
      isFree: true,
      authorId,
    },
  });
  console.log(`\nCreated play: ${play.id}`);
  console.log(`Editor URL: http://localhost:3000/editor/${play.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
