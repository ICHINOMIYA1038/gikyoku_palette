import NextAuth from "next-auth";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";
import { logSecurityEvent } from "./audit-log";

// providers / session / pages / session コールバックは auth.config.ts（middleware と共有）。ここでは DB を使うコールバックを足す
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Upsert user in the shared User table
      const existingUsers = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "public"."User" WHERE email = ${user.email}
      `;

      if (existingUsers.length === 0) {
        // Create new user
        await prisma.$queryRaw`
          INSERT INTO "public"."User" (id, name, email, "displayName", "avatarUrl", image, "updatedAt")
          VALUES (
            ${user.id || crypto.randomUUID()},
            ${user.name || ""},
            ${user.email},
            ${user.name || user.email.split("@")[0]},
            ${user.image || null},
            ${user.image || null},
            NOW()
          )
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            "avatarUrl" = EXCLUDED."avatarUrl",
            image = EXCLUDED.image,
            "updatedAt" = NOW()
        `;
      }

      // Upsert account link
      if (account) {
        await prisma.$queryRaw`
          INSERT INTO "public"."Account" (id, "userId", type, provider, "providerAccountId", access_token, token_type, scope, id_token)
          SELECT
            ${crypto.randomUUID()},
            u.id,
            ${account.type || "oauth"},
            ${account.provider},
            ${account.providerAccountId},
            ${account.access_token || null},
            ${account.token_type || null},
            ${account.scope || null},
            ${account.id_token || null}
          FROM "public"."User" u WHERE u.email = ${user.email}
          ON CONFLICT (provider, "providerAccountId") DO UPDATE SET
            access_token = EXCLUDED.access_token,
            id_token = EXCLUDED.id_token
        `;
      }

      await logSecurityEvent({ type: "login", userId: user.id, details: `provider: ${account?.provider}` });

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        // Fetch user ID from DB
        const users = await prisma.$queryRaw<Array<{ id: string; displayName: string | null; name: string | null }>>`
          SELECT id, "displayName", name FROM "public"."User" WHERE email = ${user.email}
        `;
        if (users[0]) {
          token.id = users[0].id;
          token.name = users[0].displayName || users[0].name;
        }
      }
      return token;
    },
  },
});
