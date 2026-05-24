import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">利用規約</h1>
      <p className="text-sm text-gray-500 mb-8">最終更新日: 2026年4月29日</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-3">第1条（サービスの概要）</h2>
          <p>
            戯曲パレット（以下「本サービス」）は、戯曲（脚本）の投稿・公開・閲覧、および上演許可の申請・管理を行うためのウェブプラットフォームです。本サービスは
            <a href="https://palette.gikyokutosyokan.com" className="text-blue-600 hover:underline">https://palette.gikyokutosyokan.com</a>
            にて提供されます。
          </p>
          <p className="mt-2">
            本サービスは、姉妹サイト「戯曲図書館」（gikyokutosyokan.com）と同一の運営者によって提供されています。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第2条（規約への同意）</h2>
          <p>
            ユーザーは、本サービスを利用することにより、本利用規約（以下「本規約」）に同意したものとみなします。本規約に同意いただけない場合は、本サービスをご利用いただけません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第3条（ユーザー登録）</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>本サービスの利用にはユーザー登録が必要な場合があります。登録はGoogleアカウントによる認証（OAuth）を通じて行います。</li>
            <li>ユーザーは、正確かつ最新の情報を提供するものとします。</li>
            <li>一人のユーザーが複数のアカウントを作成することは禁止します。</li>
            <li>アカウントの管理責任はユーザー自身にあり、第三者への貸与・譲渡はできません。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第4条（作品の投稿・公開）</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>ユーザーは、自らが著作権を有する、または正当な権利を有する戯曲作品のみを投稿できます。</li>
            <li>投稿された作品の著作権は、投稿者に帰属します。ただし、本サービス上での表示・配信に必要な範囲で、運営者に対して非独占的な利用許諾を付与するものとします。</li>
            <li>投稿者は、作品を下書き・公開・非公開の状態に自由に切り替えることができます。</li>
            <li>公開された作品は、本サービスの利用者が閲覧できる状態となります。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第5条（上演許可）</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>劇団・団体等のユーザー（以下「申請者」）は、本サービスを通じて作品の上演許可を作家に申請できます。</li>
            <li>上演許可の承認・拒否は、作品の著作権者（作家）の判断に委ねられます。</li>
            <li>上演許可が承認された場合、本サービスを通じて許可証（PDF）が発行されます。</li>
            <li>上演許可の条件（上演料、期間、回数等）は、作家が設定するものとし、本サービスはその仲介を行います。</li>
            <li>運営者は、上演許可に関する当事者間の紛争について、一切の責任を負いません。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第6条（上演料の支払い）</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>本サービスは、上演料の決済処理を一切行いません。作家と申請者は、作家が提示する銀行口座等への直接振込により、当事者間で支払いを完結させるものとします。</li>
            <li>作家は、上演許可の承認時に振込先口座情報を申請者に提示するものとします。申請者は、提示された口座に対し、自らの責任において振込を行います。</li>
            <li>申請者は、振込完了後に本サービス上で振込報告を行います。作家は、入金を確認のうえ、本サービス上で許可証を発行します。</li>
            <li>振込手数料は申請者の負担とします。</li>
            <li>振込・入金確認・返金等に関する一切の事項は、当事者間で解決するものとし、運営者は責任を負いません。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第7条（禁止事項）</h2>
          <p className="mb-2">ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
          <ul className="list-disc list-inside space-y-1">
            <li>他者の著作権、知的財産権、その他の権利を侵害する行為</li>
            <li>他者になりすまし、または虚偽の情報を登録する行為</li>
            <li>法令または公序良俗に反する内容の投稿</li>
            <li>本サービスの運営を妨害する行為（不正アクセス、スクレイピング、スパム等）</li>
            <li>他のユーザーへの嫌がらせ、誹謗中傷、脅迫</li>
            <li>許可なく作品を複製・転載・再配布する行為</li>
            <li>本サービスを利用した商業的な勧誘・宣伝（運営者が認めた場合を除く）</li>
            <li>その他、運営者が不適切と判断する行為</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第8条（コンテンツの削除・アカウント停止）</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>運営者は、本規約に違反するコンテンツを事前の通知なく削除できるものとします。</li>
            <li>重大な規約違反があった場合、運営者はユーザーのアカウントを停止または削除できるものとします。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第9条（免責事項）</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>本サービスは「現状有姿」で提供され、運営者はその完全性、正確性、可用性について一切保証しません。</li>
            <li>本サービスの利用に起因するユーザー間のトラブルについて、運営者は一切の責任を負いません。</li>
            <li>システム障害、メンテナンス等による一時的なサービス停止について、運営者は事前の通知に努めますが、損害賠償の責任を負いません。</li>
            <li>投稿された作品の内容について、運営者は一切の責任を負いません。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第10条（サービスの変更・終了）</h2>
          <p>
            運営者は、事前の通知を行った上で、本サービスの内容を変更、または提供を終了できるものとします。ただし、緊急の場合はこの限りではありません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第11条（規約の変更）</h2>
          <p>
            運営者は、必要と判断した場合、本規約を変更できるものとします。変更後の規約は、本サービス上に掲載した時点で効力を生じます。重要な変更がある場合は、本サービス上で通知いたします。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第12条（準拠法・管轄）</h2>
          <p>
            本規約は日本法に準拠し、本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </section>

        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-3">お問い合わせ</h2>
          <p>
            本規約に関するお問い合わせは、以下までご連絡ください。
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
