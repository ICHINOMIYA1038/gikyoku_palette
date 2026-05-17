import { config } from "dotenv";
config({ path: ".env.development.local" });
import { prisma } from "../src/lib/db";
async function main() {
  const users = await prisma.$queryRaw<any[]>`SELECT id, email, "displayName" FROM "public"."User" WHERE email = 'ichiryo108@gmail.com'`;
  console.log("ichiryo user:", users);
  const all = await prisma.palettePlay.findMany({ select: { id: true, title: true, authorId: true } });
  console.log("\nAll plays in local DB:");
  for (const x of all) console.log(`  ${x.id}  ${x.title}  (author=${x.authorId})`);
}
main().finally(() => prisma.$disconnect());
