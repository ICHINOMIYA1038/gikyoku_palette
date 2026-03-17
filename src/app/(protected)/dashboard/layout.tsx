import Link from "next/link";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "概要" },
  { href: "/dashboard/plays", label: "作品管理" },
  { href: "/dashboard/permissions", label: "申請管理" },
  { href: "/dashboard/sales", label: "売上" },
  { href: "/dashboard/stripe", label: "Stripe連携" },
  { href: "/dashboard/notifications", label: "通知" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-48 shrink-0">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className="justify-start"
                render={<Link href={item.href} />}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
