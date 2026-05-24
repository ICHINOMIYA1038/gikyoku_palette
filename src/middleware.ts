import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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

export default auth((req) => {
  const isProtected = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", req.nextUrl.pathname);
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  if (req.nextUrl.pathname === "/login" && req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  return applySecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
