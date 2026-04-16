/**
 * GET /api/threads/[id]
 *
 * スレッド詳細をJSONで返す。クライアント側ポーリング用。
 * 認可チェックはサーバアクション getThreadDetail が実施。
 */

import { NextResponse } from "next/server";
import { getThreadDetail } from "@/actions/threads";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const detail = await getThreadDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "not found or forbidden" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
