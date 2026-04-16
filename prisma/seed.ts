import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const genres = [
  { name: "コメディ", slug: "comedy" },
  { name: "シリアス", slug: "serious" },
  { name: "ミュージカル", slug: "musical" },
  { name: "時代劇", slug: "period" },
  { name: "ファンタジー", slug: "fantasy" },
  { name: "SF", slug: "sf" },
  { name: "ホラー", slug: "horror" },
  { name: "その他", slug: "other" },
];

async function main() {
  console.log("Seeding genres...");
  for (const genre of genres) {
    await prisma.paletteGenre.upsert({
      where: { slug: genre.slug },
      update: {},
      create: genre,
    });
  }
  console.log(`Seeded ${genres.length} genres.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
