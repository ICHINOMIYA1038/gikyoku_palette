import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://palette.gikyokutosyokan.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/authors`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/rankings`, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Dynamic play pages
  const plays = await prisma.palettePlay.findMany({
    where: { isPublished: true },
    select: { id: true, updatedAt: true },
  });

  const playPages: MetadataRoute.Sitemap = plays.map((play) => ({
    url: `${baseUrl}/plays/${play.id}`,
    lastModified: play.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Dynamic author pages (authors who have at least one published play)
  const authorRows = await prisma.$queryRaw<{ author_id: string }[]>`
    SELECT DISTINCT author_id FROM palette.palette_plays WHERE is_published = true
  `;

  const authorPages: MetadataRoute.Sitemap = authorRows.map((row) => ({
    url: `${baseUrl}/authors/${row.author_id}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...playPages, ...authorPages];
}
