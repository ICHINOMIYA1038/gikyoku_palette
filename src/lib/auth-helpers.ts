/**
 * 認可関連のヘルパー。
 *
 * 各 Server Action で `play.authorId !== session.user.id` を手書きしていた
 * チェックを共通化。所有権チェックに失敗した場合は ActionForbiddenError を投げる。
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export class ActionForbiddenError extends Error {
  constructor(message = "権限がありません") {
    super(message);
    this.name = "ActionForbiddenError";
  }
}

export class ActionNotFoundError extends Error {
  constructor(message = "対象が見つかりません") {
    super(message);
    this.name = "ActionNotFoundError";
  }
}

/**
 * 現在のセッションを取得し、ログインしていなければ /login にリダイレクトする。
 * 戻り値は user.id を保証する。
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

/**
 * 所有者である場合だけ play を返し、そうでなければ null。
 * `{ error }` 形式の戻り値で扱う action 向けの非例外版。
 *
 * import が要らないよう、full record を返すバージョンも分けてある。
 */
export async function getPlayIfOwner(playId: string, userId: string) {
  const play = await prisma.palettePlay.findUnique({ where: { id: playId } });
  if (!play || play.authorId !== userId) return null;
  return play;
}

export async function getSeriesIfOwner(seriesId: string, userId: string) {
  const series = await prisma.paletteSeries.findUnique({ where: { id: seriesId } });
  if (!series || series.authorId !== userId) return null;
  return series;
}

/**
 * 指定した play の所有者であることを保証する。
 * 見つからない／所有者でない場合は例外を投げる。
 */
export async function assertPlayOwner(playId: string, userId: string) {
  const play = await prisma.palettePlay.findUnique({
    where: { id: playId },
    select: { id: true, authorId: true },
  });
  if (!play) throw new ActionNotFoundError();
  if (play.authorId !== userId) throw new ActionForbiddenError();
  return play;
}

/**
 * 指定した series の所有者であることを保証する。
 */
export async function assertSeriesOwner(seriesId: string, userId: string) {
  const series = await prisma.paletteSeries.findUnique({
    where: { id: seriesId },
    select: { id: true, authorId: true },
  });
  if (!series) throw new ActionNotFoundError();
  if (series.authorId !== userId) throw new ActionForbiddenError();
  return series;
}

/**
 * permission に対して、申請者または対象作品の作家であることを保証する。
 * 双方向（申請者・作家）のどちらでも閲覧可。
 */
export async function assertPermissionParticipant(permissionId: string, userId: string) {
  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: { select: { authorId: true } } },
  });
  if (!permission) throw new ActionNotFoundError();
  if (permission.applicantId !== userId && permission.play.authorId !== userId) {
    throw new ActionForbiddenError();
  }
  return permission;
}

/**
 * permission の対象作品の作家であることを保証する。
 */
export async function assertPermissionOwner(permissionId: string, userId: string) {
  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: { select: { authorId: true } } },
  });
  if (!permission) throw new ActionNotFoundError();
  if (permission.play.authorId !== userId) throw new ActionForbiddenError();
  return permission;
}
