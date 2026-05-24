/**
 * `public.User` テーブルへの型安全なアクセスヘルパー。
 *
 * 戯曲パレットは `palette` schema を Prisma で管理しているが、
 * 認証系の User テーブルは別アプリと共有の `public.User` にあるため
 * Prisma モデルとして直接定義できず、$queryRaw で取得している。
 * 本ファイルで型を集約し、各 action から `any[]` キャストを排除する。
 */
import { prisma } from "@/lib/db";

export type PublicUser = {
  id: string;
  name: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type PublicUserWithEmail = PublicUser & {
  email: string | null;
};

export type PublicUserWithBio = PublicUser & {
  bio: string | null;
};

const UNKNOWN_USER: PublicUser = {
  id: "",
  name: null,
  displayName: "不明",
  avatarUrl: null,
};

export function unknownUser(id: string): PublicUser {
  return { ...UNKNOWN_USER, id };
}

export async function getPublicUser(id: string): Promise<PublicUser | null> {
  const rows = await prisma.$queryRaw<PublicUser[]>`
    SELECT id, name, "displayName", "avatarUrl"
    FROM "public"."User" WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function getPublicUserWithEmail(id: string): Promise<PublicUserWithEmail | null> {
  const rows = await prisma.$queryRaw<PublicUserWithEmail[]>`
    SELECT id, name, "displayName", "avatarUrl", email
    FROM "public"."User" WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function getPublicUserWithBio(id: string): Promise<PublicUserWithBio | null> {
  const rows = await prisma.$queryRaw<PublicUserWithBio[]>`
    SELECT id, name, "displayName", "avatarUrl", bio
    FROM "public"."User" WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function getPublicUsersByIds(ids: string[]): Promise<Map<string, PublicUser>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.$queryRaw<PublicUser[]>`
    SELECT id, name, "displayName", "avatarUrl"
    FROM "public"."User" WHERE id = ANY(${ids})
  `;
  return new Map(rows.map((u) => [u.id, u]));
}
