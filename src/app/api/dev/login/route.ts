/**
 * Dev-only login endpoint.
 *
 * Issues an Auth.js session cookie for an existing seed user so browser
 * automation / manual QA can simulate multiple users without going through
 * Google OAuth. Returns 404 in any non-development environment.
 *
 * Usage: GET /api/dev/login?email=taro@example.com&redirectTo=/dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "authjs.session-token";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "email query parameter is required" },
      { status: 400 }
    );
  }

  const users = await prisma.$queryRaw<
    Array<{ id: string; name: string | null; email: string; displayName: string | null }>
  >`
    SELECT id, name, email, "displayName" FROM "User" WHERE email = ${email}
  `;

  if (users.length === 0) {
    return NextResponse.json(
      { error: `user not found: ${email}` },
      { status: 404 }
    );
  }

  const user = users[0];
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "AUTH_SECRET is not set" },
      { status: 500 }
    );
  }

  const jwt = await encode({
    token: {
      id: user.id,
      sub: user.id,
      name: user.displayName || user.name,
      email: user.email,
    },
    secret,
    salt: COOKIE_NAME,
    maxAge: MAX_AGE,
  });

  const redirectTo = req.nextUrl.searchParams.get("redirectTo") || "/dashboard";
  const res = NextResponse.redirect(new URL(redirectTo, req.nextUrl.origin));
  res.cookies.set({
    name: COOKIE_NAME,
    value: jwt,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return res;
}
