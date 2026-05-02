/**
 * エディタ専用レイアウト。
 * fixed全画面でブラウザスクロールを完全にブロック。
 */
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
      {children}
    </div>
  );
}
