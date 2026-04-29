import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ",
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">お問い合わせ</h1>

      <div className="space-y-6 text-gray-700">
        <p>
          戯曲パレットに関するお問い合わせは、以下のメールアドレスまでご連絡ください。
        </p>

        <div className="bg-gray-50 rounded-lg p-6">
          <p className="text-sm text-gray-500 mb-1">メールアドレス</p>
          <a
            href="mailto:ichiryo108@gmail.com"
            className="text-lg font-medium text-blue-600 hover:text-blue-800"
          >
            ichiryo108@gmail.com
          </a>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">お問い合わせ内容の例</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>サービスに関するご質問</li>
            <li>不具合のご報告</li>
            <li>作品の権利に関するご相談</li>
            <li>その他のご要望</li>
          </ul>
        </div>

        <p className="text-sm text-gray-500">
          ※ 通常2〜3営業日以内にご返信いたします。
        </p>
      </div>
    </div>
  );
}
