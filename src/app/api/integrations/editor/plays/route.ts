// 戯曲エディタの「パレットに投稿」。原稿から非公開の作品を作る。同じ原稿の作品があれば、新しく作らずにそれを返す
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { json, parseImport, userIdFromBearer } from "@/lib/editor-integration";

export async function POST(req: NextRequest) {
  const userId = await userIdFromBearer(req);
  if (!userId) return json({ error: "unauthorized" }, 401);

  const input = parseImport(await req.json().catch(() => null), true);
  if (typeof input === "string") return json({ error: input }, input === "too_large" ? 413 : 400);

  const existing = await prisma.palettePlay.findUnique({
    where: { sourceScriptId: input.scriptId },
    select: { id: true, authorId: true },
  });
  if (existing) {
    // 他人の作品に結ばれた原稿 ID は、存在を明かさない
    if (existing.authorId !== userId) return json({ error: "conflict" }, 409);
    return json({ playId: existing.id, created: false });
  }

  const play = await prisma.palettePlay.create({
    data: {
      title: input.title ?? "無題の作品",
      synopsis: "",
      body: input.body,
      bodyType: "editor",
      authorId: userId,
      isPublished: false,
      sourceScriptId: input.scriptId,
      sourceRevision: input.revision,
    },
    select: { id: true },
  });
  revalidatePath("/dashboard/plays");
  return json({ playId: play.id, created: true }, 201);
}
