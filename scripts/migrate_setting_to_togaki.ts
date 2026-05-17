/**
 * 既存playのbodyJson内 setting → togaki に変換
 */
import { config } from "dotenv";
config({ path: ".env.development.local" });
import { prisma } from "../src/lib/db";

async function main() {
  const plays = await prisma.palettePlay.findMany({
    select: { id: true, title: true, bodyJson: true },
  });
  let changed = 0;
  for (const p of plays) {
    const json = p.bodyJson as any;
    if (!json || !Array.isArray(json.blocks)) continue;
    let modified = false;
    const newBlocks = json.blocks.map((b: any) => {
      if (b?.type === "setting") {
        modified = true;
        return { type: "togaki", text: b.text || "" };
      }
      return b;
    });
    if (modified) {
      await prisma.palettePlay.update({
        where: { id: p.id },
        data: { bodyJson: { ...json, blocks: newBlocks } },
      });
      changed++;
      console.log(`Migrated: ${p.id}  ${p.title}`);
    }
  }
  console.log(`\nTotal migrated: ${changed} play(s)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
