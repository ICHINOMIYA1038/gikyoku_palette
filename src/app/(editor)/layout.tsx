/**
 * エディタ専用レイアウト。サイドバーなし、画面全体を使う。
 */
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-screen overflow-hidden">{children}</div>;
}
