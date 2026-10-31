import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// next-auth の設定のうち、DB（Prisma）に触れない部分。
// middleware は edge ランタイムで束ねられるので、Prisma を読み込む auth.ts を import できない
// （Cloudflare Workers では Node の crypto が無くて 500 になる。2026-10-31）。
// middleware はこの設定だけで JWT のセッションを読む。DB を使う signIn / jwt は auth.ts で足す。
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "online",
          scope: "openid email profile",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
