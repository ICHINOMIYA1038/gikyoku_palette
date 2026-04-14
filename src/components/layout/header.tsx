"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@supabase/supabase-js";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        setDisplayName(
          user.user_metadata?.display_name ||
            user.user_metadata?.full_name ||
            "ユーザー"
        );
      }
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setDisplayName(
          session.user.user_metadata?.display_name ||
            session.user.user_metadata?.full_name ||
            "ユーザー"
        );
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          戯曲パレット
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="relative h-8 w-8 rounded-full"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.user_metadata?.avatar_url}
                    alt={displayName}
                  />
                  <AvatarFallback>
                    {displayName.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/dashboard">ダッシュボード</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/permissions">マイ申請</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/profile/edit">プロフィール編集</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button render={<Link href="/login" />}>ログイン</Button>
          )}
        </nav>
      </div>
    </header>
  );
}
