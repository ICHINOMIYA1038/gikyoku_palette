import { config } from "dotenv";
config({ path: ".env.local" });
import { prisma } from "../src/lib/db";
async function main() {
  const plays = await prisma.palettePlay.findMany({ select: { authorId: true }, distinct: ["authorId"], take: 5 });
  for (const p of plays) console.log(p.authorId);
}
main().finally(() => prisma.$disconnect());
