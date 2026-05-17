import { config } from "dotenv";
config({ path: ".env.local" });
import { prisma } from "../src/lib/db";
async function main() {
  const plays = await prisma.palettePlay.findMany({
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
  for (const p of plays) console.log(`${p.id}\t${p.title}\t${p.updatedAt.toISOString()}`);
}
main().finally(() => prisma.$disconnect());
