import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";

export type BannerVariant = "success" | "error" | "warning" | "info";

const STYLES: Record<BannerVariant, { wrap: string; Icon: typeof CheckCircle2 }> = {
  success: {
    wrap: "border-green-200 bg-green-50 text-green-800",
    Icon: CheckCircle2,
  },
  error: {
    wrap: "border-red-200 bg-red-50 text-red-800",
    Icon: AlertCircle,
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-800",
    Icon: AlertTriangle,
  },
  info: {
    wrap: "border-blue-200 bg-blue-50 text-blue-800",
    Icon: Info,
  },
};

type Props = {
  variant?: BannerVariant;
  children: ReactNode;
  className?: string;
};

export function Banner({ variant = "info", children, className = "" }: Props) {
  const { wrap, Icon } = STYLES[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${wrap} ${className}`}
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
