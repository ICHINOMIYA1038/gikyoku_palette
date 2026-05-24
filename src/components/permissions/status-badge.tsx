/**
 * 許可申請ステータスのバッジ。
 * 一覧・詳細ページで同じ見た目を維持するため、ここに色定義を集約する。
 */

import { PERMISSION_STATUS_LABELS } from "@/types";
import type { PermissionStatus } from "@/types";

const STATUS_STYLES: Record<PermissionStatus, string> = {
  pending: "bg-sky-50 text-sky-700 ring-sky-200",
  approved: "bg-amber-50 text-amber-700 ring-amber-200",
  paid: "bg-blue-50 text-blue-700 ring-blue-200",
  permitted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  expired: "bg-zinc-100 text-zinc-500 ring-zinc-200",
  revision_requested: "bg-orange-50 text-orange-700 ring-orange-200",
  withdrawn: "bg-slate-100 text-slate-500 ring-slate-200",
};

type Size = "sm" | "md";

const SIZE_STYLES: Record<Size, string> = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

export function PermissionStatusBadge({
  status,
  size = "md",
}: {
  status: PermissionStatus;
  size?: Size;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-medium ring-1 ${STATUS_STYLES[status]} ${SIZE_STYLES[size]}`}
    >
      {PERMISSION_STATUS_LABELS[status]}
    </span>
  );
}
