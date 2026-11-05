// 戯曲エディタの「投稿した本文を更新」。本文と取り込んだ版だけを変え、公開状態・あらすじ・上演許可には触れない
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { json, parseImport, userIdFromBearer } from "@/lib/editor-integration";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await userIdFromBearer(req);
  if (!userId) return json({ error: "unauthorized" }, 401);

  const input = parseImport(await req.json().catch(() => null), false);
  if (typeof input === "string") return json({ error: input }, input === "too_large" ? 413 : 400);

  const { id } = await params;
  // 作者と原稿 ID の両方が一致し、取り込み済みの版より新しいときだけ更新する（遅れて届いた古い本文で上書きしない）
  const result = await prisma.palettePlay.updateMany({
    where: {
      id,
      authorId: userId,
      sourceScriptId: input.scriptId,
      OR: [{ sourceRevision: null }, { sourceRevision: { lt: input.revision } }],
    },
    data: { body: input.body, sourceRevision: input.revision },
  });

  if (result.count === 0) {
    const play = await prisma.palettePlay.findFirst({
      where: { id, authorId: userId, sourceScriptId: input.scriptId },
      select: { sourceRevision: true },
    });
    if (!play) return json({ error: "not_found" }, 404);
    if (play.sourceRevision === input.revision) return json({ playId: id, updated: false });
    return json({ error: "stale_revision", sourceRevision: play.sourceRevision }, 409);
  }

  revalidatePath(`/plays/${id}`);
  revalidatePath(`/dashboard/plays/${id}/edit`);
  return json({ playId: id, updated: true });
}
