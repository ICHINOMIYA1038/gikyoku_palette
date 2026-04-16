"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  ShieldCheck,
  MessageCircle,
  Heart,
  UserPlus,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  name: string;
  avatarUrl: string | null;
  /** server action - logout */
  signOutAction: () => void;
};

/**
 * グローバルヘッダー右側のユーザーメニュー。
 * ボタンクリックで以下リンクを集約表示し、各ページから1クリックで戻れるようにする。
 *  - マイページ / マイ申請 / メッセージ / お気に入り / フォロー / プロフィール / ログアウト
 */
export function UserMenu({ name, avatarUrl, signOutAction }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-full px-1 py-1 text-sm text-gray-600 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-pink-200">
        <Avatar className="h-7 w-7">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt="" />
          ) : (
            <AvatarFallback className="text-xs">
              {name.slice(0, 1)}
            </AvatarFallback>
          )}
        </Avatar>
        <span className="max-w-[120px] truncate">{name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem render={<Link href="/dashboard" />}>
          <LayoutDashboard className="h-4 w-4" />
          マイページ
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/permissions" />}>
          <ShieldCheck className="h-4 w-4" />
          マイ申請
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/threads" />}>
          <MessageCircle className="h-4 w-4" />
          メッセージ
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/bookmarks" />}>
          <Heart className="h-4 w-4" />
          お気に入り
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/following" />}>
          <UserPlus className="h-4 w-4" />
          フォロー
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile/edit" />}>
          <User className="h-4 w-4" />
          プロフィール
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <form action={signOutAction}>
              <button type="submit" className="flex w-full items-center gap-2">
                <LogOut className="h-4 w-4" />
                ログアウト
              </button>
            </form>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
