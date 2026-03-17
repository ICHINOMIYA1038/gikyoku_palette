import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user profile exists, create if not
      const existingUser = await prisma.user.findUnique({
        where: { id: data.user.id },
      });

      if (!existingUser) {
        await prisma.user.create({
          data: {
            id: data.user.id,
            displayName:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              "未設定",
            avatarUrl: data.user.user_metadata?.avatar_url || null,
          },
        });

        // First login - redirect to profile edit
        return NextResponse.redirect(`${origin}/profile/edit?first=true`);
      }

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
