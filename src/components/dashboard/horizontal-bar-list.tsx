/**
 * 「ランキング」表示用の水平バーリスト。
 * 各行に label / value、および max に対する比率の塗り。
 */

import Link from "next/link";

type Item = {
  id: string;
  label: string;
  value: number;
  href?: string | null;
  meta?: string;
};

type Props = {
  items: Item[];
  format?: (v: number) => string;
  emptyText?: string;
};

export function HorizontalBarList({
  items,
  format = (v) => v.toLocaleString(),
  emptyText = "データがありません",
}: Props) {
  if (items.length === 0) {
    return (
      <p className="text-center text-xs text-gray-400 py-6">{emptyText}</p>
    );
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const pct = Math.max(2, Math.round((item.value / max) * 100));
        const Body = (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate font-medium text-gray-800">
                {item.label}
              </span>
              <span className="text-gray-500">
                {format(item.value)}
                {item.meta && (
                  <span className="ml-1 text-gray-400">{item.meta}</span>
                )}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-pink-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
        return (
          <li key={item.id}>
            {item.href ? (
              <Link href={item.href} className="block hover:opacity-80">
                {Body}
              </Link>
            ) : (
              Body
            )}
          </li>
        );
      })}
    </ul>
  );
}
