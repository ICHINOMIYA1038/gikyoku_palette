/**
 * 戯曲 ID（共通ログイン）のセッションを読む。
 *
 * ログイン画面と Cookie の発行は ID ポータル（id.gikyokutosyokan.com、リポジトリ gikyoku_id）が持つ。
 * パレットは親ドメインの Cookie `gid_at`（Supabase Auth のアクセストークン、JWT）を
 * Supabase の公開鍵（JWKS、ES256）で検証し、`sub` → `public.User.authUserId` で利用者を引くだけ。
 * 設計は台帳 docs/gikyoku-id.md。
 */
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/lib/db";

export const ID_COOKIE = "gid_at";
/** ポータルにセッションがある印。gid_at が切れていてこれがあれば /refresh で取り直せる */
export const ID_HINT_COOKIE = "gid_s";

const SUPABASE_AUTH_URL = process.env.GIKYOKU_ID_SUPABASE_URL ?? "https://tujkphrlvcbxbrrkagsj.supabase.co";
export const PORTAL_URL = process.env.GIKYOKU_ID_URL ?? "https://id.gikyokutosyokan.com";

const jwks = createRemoteJWKSet(new URL(`${SUPABASE_AUTH_URL}/auth/v1/.well-known/jwks.json`));

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type Session = { user: SessionUser };

/** JWT を検証して Supabase の利用者 ID（sub）を返す。無効なら null */
export async function verifyIdToken(token: string): Promise<{ sub: string; email: string | null } | null> {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${SUPABASE_AUTH_URL}/auth/v1`,
      audience: "authenticated",
    });
    if (!payload.sub) return null;
    return { sub: payload.sub, email: typeof payload.email === "string" ? payload.email : null };
  } catch {
    return null;
  }
}

/**
 * 現在のセッション。next-auth の `auth()` と同じ形（`session.user.id`）を返すので、呼び出し側はそのまま。
 * 同じリクエスト内では 1 回しか検証・DB 参照しない（React の cache）
 */
export const auth = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(ID_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifyIdToken(token);
  if (!claims) return null;

  const rows = await prisma.$queryRaw<SessionUser[]>`
    SELECT id, COALESCE("displayName", name) AS name, email, COALESCE("avatarUrl", image) AS image
    FROM "public"."User" WHERE "authUserId" = ${claims.sub}
  `;
  const user = rows[0];
  if (!user) return null; // ポータルでログインしたのに User が無い＝ポータル側の紐づけ待ち。未ログイン扱い
  return { user };
});

/**
 * このサイトの origin（https://palette.gikyokutosyokan.com）。リクエストの Host から決める。
 * NEXT_PUBLIC_APP_URL はビルド時に埋め込まれるので、手元のビルドが本番に出ると localhost になってしまうため使わない
 */
export async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "palette.gikyokutosyokan.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** ログイン画面（ポータル）へ。戻り先はこのサイトのパス（絶対 URL でもよい） */
export async function loginUrl(returnTo: string): Promise<string> {
  const absolute = returnTo.startsWith("/") ? `${await appOrigin()}${returnTo}` : returnTo;
  return `${PORTAL_URL}/?return_to=${encodeURIComponent(absolute)}`;
}

/** ポータルのログアウト確認画面へ。全サービス・この端末のセッションが消える */
export async function signOut({ redirectTo }: { redirectTo: string }): Promise<never> {
  const absolute = redirectTo.startsWith("/") ? `${await appOrigin()}${redirectTo}` : redirectTo;
  redirect(`${PORTAL_URL}/logout?return_to=${encodeURIComponent(absolute)}`);
}
