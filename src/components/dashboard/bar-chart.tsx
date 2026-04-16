/**
 * 軽量SVGバーチャート（依存なし）。日次・月次の小さな棒グラフに使う。
 * - data: [{ label, value }] の配列、左→右に時系列で並ぶ前提
 * - max が 0 のときも見えるように 1px の床を保持
 */

type Datum = { label: string; value: number };

type Props = {
  data: Datum[];
  /** 高さ (px) */
  height?: number;
  /** バーの色（tailwind の text-class を使うので fill="currentColor" になる） */
  colorClass?: string;
  /** 値のフォーマット（tooltip 表示） */
  format?: (v: number) => string;
  /** 末尾ラベル（最新値）を強調表示 */
  showLatestLabel?: boolean;
};

export function BarChart({
  data,
  height = 80,
  colorClass = "text-pink-400",
  format = (v) => v.toLocaleString(),
  showLatestLabel = false,
}: Props) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400"
        style={{ height }}
      >
        データなし
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 100 / data.length;
  const gap = barWidth * 0.18;
  const inner = barWidth - gap;

  const latest = data[data.length - 1];

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className={`w-full ${colorClass}`}
        style={{ height }}
      >
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 2);
          const y = height - h;
          const x = i * barWidth + gap / 2;
          return (
            <rect
              key={`${d.label}-${i}`}
              x={x}
              y={y}
              width={inner}
              height={h || 1}
              rx="0.6"
              fill="currentColor"
              opacity={d.value === 0 ? 0.18 : 0.9}
            >
              <title>{`${d.label}: ${format(d.value)}`}</title>
            </rect>
          );
        })}
      </svg>
      {showLatestLabel && (
        <p className="text-right text-[10px] text-gray-400">
          最新: {latest.label} ・ {format(latest.value)}
        </p>
      )}
    </div>
  );
}
