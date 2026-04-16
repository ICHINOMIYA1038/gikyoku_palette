"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
        isActive
          ? "bg-gray-100 text-gray-900 font-medium"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
