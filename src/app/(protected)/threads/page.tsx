import { MessageCircle } from "lucide-react";

export const metadata = { title: "メッセージ" };

export default function ThreadsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-lg border border-gray-200 py-20 text-center">
        <MessageCircle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h1 className="text-xl font-serif font-bold text-gray-700">
          メッセージ機能は現在準備中です
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500">
          メッセージ機能は現在実装中です。今しばらくお待ちください。
        </p>
      </div>
    </div>
  );
}
