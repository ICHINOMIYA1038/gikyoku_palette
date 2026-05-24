export const metadata = { title: "特定商取引法に基づく表記" };

export default function LegalPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">
        特定商取引法に基づく表記
      </h1>
      <p className="mt-3 text-sm text-gray-500">
        特定商取引に関する法律第11条に基づき、以下のとおり表記します。
      </p>

      <dl className="mt-8 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        <Row label="販売事業者">一ノ宮 綾平</Row>
        <Row label="運営責任者">一ノ宮 綾平</Row>
        <Row label="所在地">
          〒600-8846
          <br />
          京都府京都市下京区朱雀宝蔵町44番地 協栄ビル2階
          <br />
          京都朱雀スタジオAX-401
        </Row>
        <Row label="電話番号">
          請求があれば遅滞なく開示します。お問い合わせフォームよりご連絡ください。
        </Row>
        <Row label="メールアドレス">
          請求があれば遅滞なく開示します。お問い合わせフォームよりご連絡ください。
        </Row>
        <Row label="電気通信事業届出番号">
          A-08-23628（令和8年5月18日届出）
        </Row>
        <Row label="販売価格">
          各戯曲の上演許可申請ページに表示される使用料（作家設定）。
        </Row>
        <Row label="商品代金以外の必要料金">
          振込手数料（申請者負担）
        </Row>
        <Row label="支払方法">
          銀行振込（当事者間直接振込）
          <br />
          本サービスは決済処理を行わず、作家と申請者の間で直接お振込みいただきます。
        </Row>
        <Row label="支払時期">
          作家が上演許可申請を承認後、提示された振込先口座へお振込みください（原則30日以内）。
        </Row>
        <Row label="役務の提供時期">
          作家が入金を確認後、許可証PDFを発行します。
        </Row>
        <Row label="返品・キャンセル">
          役務（上演許可）の性質上、許可証発行後のキャンセル・返金は原則承れません。
          振込前であればキャンセル可能です。振込後・許可証発行後の返金は当事者間で協議のうえ解決するものとし、運営者は関与しません。
        </Row>
        <Row label="動作環境">
          最新版の主要ブラウザ（Chrome / Safari / Edge / Firefox）
        </Row>
      </dl>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 px-4 py-4 sm:grid-cols-[12rem_1fr] sm:gap-4 sm:py-3">
      <dt className="text-sm font-medium text-gray-700">{label}</dt>
      <dd className="text-sm leading-relaxed text-gray-600">{children}</dd>
    </div>
  );
}
