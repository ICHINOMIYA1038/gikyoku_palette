import Link from "next/link";
import {
  FileText,
  Send,
  Banknote,
  Award,
  Sparkles,
  ShieldCheck,
  Users,
  Search,
  PenTool,
  ArrowRight,
  Check,
} from "lucide-react";

type Stats = { playCount: number; authorCount: number; reviewCount: number };

/**
 * 未ログイン時のランディングページ。
 * スクショ画像は public/landing/ に差し替え予定（現状は CSS モックアップ）。
 */
export function Landing({ stats }: { stats: Stats }) {
  return (
    <div className="bg-white">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden border-b border-gray-100 bg-gradient-to-b from-pink-50/60 via-white to-white">
        <div className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-pink-100/70 px-3 py-1 text-xs font-medium text-pink-700">
              <Sparkles className="h-3 w-3" /> 戯曲投稿・上演許可プラットフォーム
            </p>
            <h1 className="font-serif text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
              戯曲を、もっと
              <br className="md:hidden" />
              上演しやすく。
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-600 md:text-lg">
              作家は作品を投稿・公開し、劇団は上演許可をオンラインで申請。
              <br className="hidden md:block" />
              許可証PDFまでワンストップで完結する、戯曲のためのプラットフォームです。
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-pink-500 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-pink-600 sm:w-auto"
              >
                無料で始める
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
              <Link
                href="/?sort=newest&page=1"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-6 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
              >
                作品を探す
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 text-center">
              <Stat label="公開作品" value={stats.playCount.toLocaleString()} unit="作" />
              <Stat label="登録作家" value={stats.authorCount.toLocaleString()} unit="名" />
              <Stat label="レビュー" value={stats.reviewCount.toLocaleString()} unit="件" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== For Whom ===== */}
      <section className="border-b border-gray-100 bg-white">
        <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="grid gap-6 md:grid-cols-2">
            <AudienceCard
              title="作家・脚本家の方へ"
              icon={PenTool}
              accent="pink"
              points={[
                "戯曲を公開して、新しい上演機会を生み出せる",
                "上演料・条件を自由に設定。無料公開もOK",
                "申請承認・許可証発行までブラウザで完結",
                "PDF / 執筆エディタどちらでも投稿可能",
              ]}
            />
            <AudienceCard
              title="劇団・制作の方へ"
              icon={Users}
              accent="sky"
              points={[
                "条件（人数・時間・ジャンル）で戯曲を横断検索",
                "作家へオンラインで上演許可を申請",
                "許可証PDFが発行され、稽古場や劇場で提示可能",
                "メッセージ機能で作家と直接やり取り",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ===== Flow ===== */}
      <section className="border-b border-gray-100 bg-gray-50/50">
        <div className="container mx-auto max-w-5xl px-4 py-16 md:py-20">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-pink-600">
              How it works
            </p>
            <h2 className="font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              上演許可までの流れ
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              申請から許可証発行まで、最短その日のうちに完了します。
            </p>
          </div>

          <ol className="space-y-10">
            <FlowStep
              n={1}
              icon={Search}
              title="戯曲を探す"
              description="人数・上演時間・ジャンルで絞り込み、上演したい作品を見つけます。試し読みPDFも閲覧可能。"
              mockup={<MockSearch />}
            />
            <FlowStep
              n={2}
              icon={Send}
              title="上演許可を申請"
              description="団体名・公演日程・会場などをフォームで入力して送信。作家にメッセージを添えられます。"
              mockup={<MockApply />}
              flip
            />
            <FlowStep
              n={3}
              icon={Banknote}
              title="作家が承認 → 上演料を振込"
              description="作家が申請を承認すると振込先が提示されます。直接振込み、「振込しました」を報告。"
              mockup={<MockTransfer />}
            />
            <FlowStep
              n={4}
              icon={Award}
              title="許可証PDFを受け取る"
              description="作家が入金確認後、許可番号付きの許可証PDFが発行されます。稽古場・劇場で提示できます。"
              mockup={<MockCertificate />}
              flip
            />
          </ol>
        </div>
      </section>

      {/* ===== Trust ===== */}
      <section className="border-b border-gray-100 bg-white">
        <div className="container mx-auto max-w-5xl px-4 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            <TrustCard
              icon={ShieldCheck}
              title="電気通信事業届出済"
              desc="総務大臣届出番号 A-08-23628。安心してご利用いただけます。"
            />
            <TrustCard
              icon={FileText}
              title="許可証PDF自動発行"
              desc="日本語フォント埋め込みの正式な許可証を即時発行。劇場提出にそのまま使えます。"
            />
            <TrustCard
              icon={Users}
              title="戯曲図書館と連携"
              desc="姉妹サイト「戯曲図書館」と共通アカウント。既存ユーザーはそのままログイン可能。"
            />
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
        <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="font-serif text-2xl font-bold md:text-3xl">
            あなたの戯曲を、舞台へ。
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-pink-50 md:text-base">
            Googleアカウントで30秒で登録。
            <br className="md:hidden" />
            作品の公開も、上演許可申請も、すべて無料で始められます。
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-sm font-medium text-pink-600 shadow-sm transition-transform hover:scale-105"
          >
            無料で始める
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ===== sub components ===== */

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-gray-900 md:text-3xl">
        {value}
        <span className="ml-0.5 text-sm font-medium text-gray-400">{unit}</span>
      </p>
      <p className="mt-0.5 text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

function AudienceCard({
  title,
  icon: Icon,
  accent,
  points,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "pink" | "sky";
  points: string[];
}) {
  const colors =
    accent === "pink"
      ? "border-pink-200 bg-pink-50/40 text-pink-700"
      : "border-sky-200 bg-sky-50/40 text-sky-700";
  return (
    <div className={`rounded-2xl border ${colors} p-6 md:p-8`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <ul className="space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-gray-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlowStep({
  n,
  icon: Icon,
  title,
  description,
  mockup,
  flip,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  mockup: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <li className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
      <div className={flip ? "md:order-2" : ""}>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-pink-500 text-sm font-bold text-white">
            {n}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-pink-700">
            <Icon className="h-3.5 w-3.5" /> Step {n}
          </span>
        </div>
        <h3 className="mt-3 font-serif text-xl font-semibold text-gray-900 md:text-2xl">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">
          {description}
        </p>
      </div>
      <div className={flip ? "md:order-1" : ""}>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          {mockup}
        </div>
      </div>
    </li>
  );
}

function TrustCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <Icon className="mb-3 h-5 w-5 text-pink-600" />
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{desc}</p>
    </div>
  );
}

/* ===== UI mockups (CSS のみで実画面風に。後でスクショに差し替え可) ===== */

function FrameLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 border-b border-gray-100 px-1 pb-1.5">
      <span className="h-2 w-2 rounded-full bg-rose-300" />
      <span className="h-2 w-2 rounded-full bg-amber-300" />
      <span className="h-2 w-2 rounded-full bg-emerald-300" />
      <span className="ml-2 text-[10px] text-gray-400">{children}</span>
    </div>
  );
}

function MockSearch() {
  return (
    <div className="rounded-lg bg-gray-50/60 p-3">
      <FrameLabel>palette.gikyokutosyokan.com</FrameLabel>
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[11px] text-gray-500">人数・上演時間で絞り込む</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { t: "桜の樹の下には", a: "森ふみ夫", m: "90分 / 4人" },
            { t: "月の卒業式", a: "森ふみ夫", m: "60分 / 6人" },
            { t: "海辺のレシピ", a: "山口梨子", m: "45分 / 3人" },
            { t: "深夜の図書室", a: "高原千夏", m: "120分 / 8人" },
          ].map((p) => (
            <div
              key={p.t}
              className="rounded-md border border-gray-200 bg-white p-2.5"
            >
              <div className="mb-1.5 h-10 rounded bg-gradient-to-br from-pink-100 to-pink-50" />
              <p className="truncate text-[11px] font-medium text-gray-800">
                {p.t}
              </p>
              <p className="truncate text-[9px] text-gray-500">{p.a}</p>
              <p className="mt-1 text-[9px] text-gray-400">{p.m}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockApply() {
  return (
    <div className="rounded-lg bg-gray-50/60 p-3">
      <FrameLabel>上演許可申請</FrameLabel>
      <div className="space-y-2">
        <div className="rounded-md border border-pink-200 bg-pink-50 p-2">
          <p className="text-[9px] uppercase tracking-wider text-pink-700">
            上演料
          </p>
          <p className="text-base font-semibold text-gray-900">¥6,000</p>
        </div>
        {[
          { label: "団体名", value: "テスト劇団" },
          { label: "公演日程", value: "2026/08/10 〜 08/12" },
          { label: "会場", value: "スタジオテスト" },
          { label: "想定観客数", value: "120人 / 4回" },
        ].map((f) => (
          <div key={f.label}>
            <p className="text-[9px] text-gray-500">{f.label}</p>
            <div className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700">
              {f.value}
            </div>
          </div>
        ))}
        <div className="h-7 rounded-md bg-pink-500 text-center text-[11px] font-medium leading-7 text-white">
          申請を送信する
        </div>
      </div>
    </div>
  );
}

function MockTransfer() {
  return (
    <div className="rounded-lg bg-gray-50/60 p-3">
      <FrameLabel>振込先のご案内</FrameLabel>
      <div className="space-y-2">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5">
          <p className="text-[9px] font-medium uppercase tracking-wider text-emerald-700">
            ✓ 申請承認
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-2.5">
          <p className="mb-1 text-[9px] font-medium uppercase tracking-wider text-gray-500">
            振込先
          </p>
          <p className="font-mono text-[11px] leading-relaxed text-gray-700">
            ○○銀行 △△支店
            <br />
            普通 1234567
            <br />
            メイギ タロウ
          </p>
        </div>
        <div className="h-7 rounded-md bg-gray-900 text-center text-[11px] font-medium leading-7 text-white">
          振込しました
        </div>
        <p className="text-[9px] leading-relaxed text-gray-500">
          ※ 決済はパレットを介さず、当事者間で直接振込みです
        </p>
      </div>
    </div>
  );
}

function MockCertificate() {
  return (
    <div className="rounded-lg bg-gray-50/60 p-3">
      <FrameLabel>許可証PDF</FrameLabel>
      <div className="rounded-lg border-2 border-rose-300 bg-white p-4">
        <div className="rounded border border-rose-200 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-rose-500">
            Performance Permission
          </p>
          <p className="mt-1 font-serif text-base font-bold text-gray-900">
            上演許可証
          </p>
          <div className="my-3 h-px bg-rose-100" />
          <p className="text-[9px] text-gray-500">許可番号</p>
          <p className="font-mono text-xs font-medium text-gray-900">
            GJ-20260524-1918
          </p>
          <div className="my-2 h-px bg-rose-100" />
          <p className="text-[9px] text-gray-600">月の卒業式</p>
          <p className="text-[9px] text-gray-500">作: 森ふみ夫</p>
          <p className="mt-2 text-[8px] text-gray-400">2026年8月10日 - 8月12日</p>
        </div>
      </div>
      <div className="mt-2 h-7 rounded-md border border-gray-300 bg-white text-center text-[11px] font-medium leading-7 text-gray-700">
        ↓ 許可証をダウンロード
      </div>
    </div>
  );
}
