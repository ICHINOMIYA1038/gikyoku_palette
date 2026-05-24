import { Clock, Users } from "lucide-react";
import { formatCast, formatDuration } from "@/lib/format";

/**
 * 作品の「⏱ 90分 / 👥 4人」をコンパクトに横並びで表示する共通コンポーネント。
 * カード・ランキング・ホーム等で重複していた断片を集約。
 */
type Props = {
  durationMinutes: number | null;
  castTotal: number | null;
  /** サイズプリセット: sm = 11px / md = 12px / lg = 14px */
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_MAP = {
  sm: { text: "text-[11px]", icon: "h-3 w-3", gap: "gap-3" },
  md: { text: "text-xs", icon: "h-3.5 w-3.5", gap: "gap-4" },
  lg: { text: "text-sm", icon: "h-4 w-4", gap: "gap-4" },
};

export function PlayMetaInline({ durationMinutes, castTotal, size = "md", className = "" }: Props) {
  const s = SIZE_MAP[size];
  return (
    <div className={`flex items-center ${s.gap} ${s.text} text-gray-400 ${className}`}>
      <span className="inline-flex items-center gap-1">
        <Clock className={s.icon} />
        {formatDuration(durationMinutes)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Users className={s.icon} />
        {formatCast(castTotal)}
      </span>
    </div>
  );
}
