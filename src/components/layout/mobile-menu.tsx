"use client";

import Link from "next/link";
import { Menu, Search, Users, Trophy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function MobileMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="メニューを開く"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-pink-200 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem render={<Link href="/" />}>
          <Search className="h-4 w-4" />
          作品を探す
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/authors" />}>
          <Users className="h-4 w-4" />
          作家一覧
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/rankings" />}>
          <Trophy className="h-4 w-4" />
          ランキング
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
