import { NextResponse, type NextRequest } from "next/server";
import { decodeJwt } from "jose";

// ログインは戯曲 ID（ポータル）。ここでは Cookie の JWT の期限だけを見て「ログイン画面へ送るか」を決める。
// 署名の検証は各ページ・action の auth()（src/lib/gikyoku-id.ts）で行う（middleware の判断は入口の案内に過ぎない）
const PORTAL_URL = process.env.GIKYOKU_ID_URL ?? "https://id.gikyokutosyokan.com";
const ID_COOKIE = "gid_at";
const ID_HINT_COOKIE = "gid_s";
/** /refresh に回したばかりの印（60 秒）。ポータルが Cookie を出せなかったときに往復し続けないため */
const BOUNCED_COOKIE = "gid_b";

const protectedPaths = ["/dashboard", "/permissions", "/profile", "/threads", "/bookmarks", "/following", "/editor"];

const securityHeaders: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https://gikyokutosyokan-public.s3.ap-northeast-1.amazonaws.com https://lh3.googleusercontent.com; " +
    "connect-src 'self' https://gikyokutosyokan-public.s3.ap-northeast-1.amazonaws.com; " +
    "frame-src 'self' https://gikyokutosyokan-public.s3.ap-northeast-1.amazonaws.com; " +
    "worker-src 'self' blob:; " +
    "font-src 'self' https://fonts.gstatic.com;",
};

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

/** 期限内の JWT が Cookie にあるか（署名は見ない） */
function hasLiveToken(req: NextRequest): boolean {
  const token = req.cookies.get(ID_COOKIE)?.value;
  if (!token) return false;
  try {
    const { exp } = decodeJwt(token);
    return typeof exp === "number" && exp * 1000 > Date.now() + 5_000;
  } catch {
    return false;
  }
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const live = hasLiveToken(req);

  // トークンは切れているがポータルにセッションがある → 一度だけ /refresh で取り直してもらう
  if (!live && req.cookies.get(ID_HINT_COOKIE) && !req.cookies.get(BOUNCED_COOKIE)) {
    const res = NextResponse.redirect(`${PORTAL_URL}/refresh?return_to=${encodeURIComponent(req.nextUrl.toString())}`);
    res.cookies.set(BOUNCED_COOKIE, "1", { maxAge: 60, path: "/", httpOnly: true, sameSite: "lax", secure: true });
    return applySecurityHeaders(res);
  }

  if (isProtected && !live) {
    return applySecurityHeaders(
      NextResponse.redirect(`${PORTAL_URL}/?return_to=${encodeURIComponent(req.nextUrl.toString())}`),
    );
  }

  if (pathname === "/login" && live) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
