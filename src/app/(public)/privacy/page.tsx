import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">プライバシーポリシー</h1>
      <p className="text-sm text-gray-500 mb-8">最終更新日: 2026年4月29日</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section>
          <p>
            戯曲パレット（以下「本サービス」）は、ユーザーの個人情報の保護を重要と考え、以下のとおりプライバシーポリシーを定めます。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">1. 収集する情報</h2>
          <p className="mb-3">本サービスでは、以下の情報を収集します。</p>

          <h3 className="font-semibold mb-2">（1）アカウント登録時に取得する情報</h3>
          <p className="mb-2">
            Googleアカウントによる認証（OAuth）を通じて、以下の情報を取得します。
          </p>
          <ul className="list-disc list-inside space-y-1 mb-4">
            <li>氏名（表示名）</li>
            <li>メールアドレス</li>
            <li>プロフィール画像</li>
          </ul>

          <h3 className="font-semibold mb-2">（2）サービス利用時に収集する情報</h3>
          <ul className="list-disc list-inside space-y-1 mb-4">
            <li>投稿された作品の内容およびメタデータ</li>
            <li>上演許可の申請・承認に関する記録</li>
            <li>レビュー、ブックマーク等のユーザー操作履歴</li>
            <li>メッセージ機能を通じたやり取りの内容</li>
          </ul>

          <h3 className="font-semibold mb-2">（3）自動的に収集する情報</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>アクセス日時、IPアドレス</li>
            <li>ブラウザの種類、OS情報</li>
            <li>閲覧ページ、リファラー情報</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. 情報の利用目的</h2>
          <p className="mb-2">収集した情報は、以下の目的で利用します。</p>
          <ul className="list-disc list-inside space-y-1">
            <li>本サービスの提供、運営、改善</li>
            <li>ユーザーの認証およびアカウント管理</li>
            <li>上演許可の申請・管理・許可証の発行</li>
            <li>決済処理の実行</li>
            <li>ユーザーへのお知らせ・通知の送信</li>
            <li>利用状況の分析およびサービス改善</li>
            <li>不正利用の検知・防止</li>
            <li>お問い合わせへの対応</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. 第三者サービスとの連携</h2>
          <p className="mb-3">本サービスは、以下の第三者サービスを利用しています。各サービスのプライバシーポリシーもあわせてご確認ください。</p>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-1">Google OAuth（認証）</h3>
              <p className="text-sm">
                ユーザー認証のためにGoogleアカウント情報を利用します。取得するのは氏名、メールアドレス、プロフィール画像に限られます。
              </p>
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                Google プライバシーポリシー
              </a>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-1">Stripe（決済処理）</h3>
              <p className="text-sm">
                上演許可に伴う決済処理に利用します。クレジットカード情報はStripeが直接管理し、本サービスのサーバーには保存されません。
              </p>
              <a href="https://stripe.com/jp/privacy" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                Stripe プライバシーポリシー
              </a>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-1">Supabase（データベース・認証基盤）</h3>
              <p className="text-sm">
                ユーザーデータおよびコンテンツの保存・管理に利用します。
              </p>
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                Supabase プライバシーポリシー
              </a>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-1">Amazon S3（ファイルストレージ）</h3>
              <p className="text-sm">
                ユーザーがアップロードした画像やPDFファイルの保存に利用します。
              </p>
              <a href="https://aws.amazon.com/jp/privacy/" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                AWS プライバシーポリシー
              </a>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Cookieの使用</h2>
          <p>
            本サービスでは、ユーザーの認証状態の維持およびサービスの利便性向上のためにCookieを使用します。ブラウザの設定によりCookieを無効にすることができますが、その場合、本サービスの一部の機能が利用できなくなる場合があります。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. 情報の第三者への提供</h2>
          <p className="mb-2">
            運営者は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく開示要求があった場合</li>
            <li>人の生命・身体・財産の保護のために必要な場合</li>
            <li>上記「第三者サービスとの連携」に記載された範囲での情報連携</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. データの保存期間</h2>
          <p>
            ユーザーの個人情報は、アカウントが有効である期間中保存します。アカウント削除の申請があった場合は、合理的な期間内にデータを削除します。ただし、法令上の保存義務がある場合は、その期間が経過するまで保存することがあります。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. ユーザーの権利</h2>
          <p className="mb-2">ユーザーは、自身の個人情報について以下の権利を有します。</p>
          <ul className="list-disc list-inside space-y-1">
            <li>保有する個人情報の開示を求める権利</li>
            <li>個人情報の訂正・更新を求める権利</li>
            <li>個人情報の削除を求める権利</li>
            <li>アカウントの削除を求める権利</li>
          </ul>
          <p className="mt-2">
            これらの権利を行使する場合は、下記のお問い合わせ先までご連絡ください。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. セキュリティ</h2>
          <p>
            運営者は、個人情報の漏えい、紛失、改ざんを防止するため、適切な技術的・組織的な安全管理措置を講じます。ただし、インターネット上の通信において完全なセキュリティを保証することはできません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. ポリシーの変更</h2>
          <p>
            運営者は、必要に応じて本プライバシーポリシーを変更できるものとします。重要な変更がある場合は、本サービス上で通知いたします。変更後のポリシーは、本ページに掲載した時点で効力を生じます。
          </p>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-3">お問い合わせ</h2>
          <p>
            個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。
          </p>
          <p className="mt-2">
            メール:{" "}
            <a href="mailto:ichiryo108@gmail.com" className="text-blue-600 hover:underline">
              ichiryo108@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
