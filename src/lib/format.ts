/**
 * 表示用のフォーマッタ。
 */
import { UNDETERMINED_LABEL } from "@/lib/constants";

/** 上演時間（分）を「90分」または「未定」で返す。 */
export function formatDuration(minutes: number | null | undefined): string {
  return minutes != null ? `${minutes}分` : UNDETERMINED_LABEL;
}

/** 出演人数を「4人」または「未定」で返す。 */
export function formatCast(total: number | null | undefined): string {
  return total != null ? `${total}人` : UNDETERMINED_LABEL;
}
