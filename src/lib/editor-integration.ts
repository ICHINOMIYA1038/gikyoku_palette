/**
 * 戯曲エディタ（editor.gikyokutosyokan.com、リポジトリ gikyoku_editor）から本文を受け取るための共通処理。
 * エディタの Worker が、利用者の戯曲 ID のトークンを Bearer で付けて呼ぶ。Cookie は受け付けない（CSRF の対象にしない）。
 * 設計は台帳 docs/gikyoku-editor.md
 */
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyIdToken } from "@/lib/gikyoku-id";

export { EDITOR_URL, MAX_BODY_CHARS, parseImport, type ImportInput } from "@/lib/editor-import";

/** Bearer のトークンから利用者（public.User.id）を返す。だめなら null */
export async function userIdFromBearer(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const claims = await verifyIdToken(token);
  if (!claims) return null;
  // パレットの Prisma は User のモデルを持たない（src/lib/gikyoku-id.ts と同じく直接引く）
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "public"."User" WHERE "authUserId" = ${claims.sub}
  `;
  return rows[0]?.id ?? null;
}

export function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
