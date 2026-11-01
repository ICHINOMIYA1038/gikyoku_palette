# 戯曲パレット (Gikyoku Palette)

> 戯曲の投稿・公開・上演許可申請までを一気通貫で扱う、作家向けプラットフォーム。

[戯曲図書館](https://github.com/ICHINOMIYA1038/gikyoku_tosyokan) の姉妹プロジェクト。上演許可申請・承認・決済・許可証PDF発行までを一つのサービス内で完結させることを目的としています。

## 主な機能

- 作家アカウントによる戯曲の投稿・公開
- 作品の詳細ページ / 上演許可申請フォーム
- 作家ダッシュボード(申請の受付・承認・却下)
- Stripe による上演許可料の決済
- 上演許可証の PDF 発行

## 技術スタック

- **Frontend**: Next.js 16 / React 19 / TypeScript / Tailwind CSS
- **Backend**: Next.js Route Handlers / Prisma ORM
- **Hosting**: Cloudflare Workers（OpenNext。2026-10-31 に Vercel から移行。main へのマージで GitHub Actions が自動デプロイ）
- **Auth**: NextAuth.js v5 (beta) with Prisma adapter
- **DB**: PostgreSQL (Supabase。戯曲図書館と同じ DB。Workers からは Hyperdrive 経由)
- **Payment**: Stripe (Checkout / Connect)
- **Storage**: AWS S3 (presigned URL)
- **PDF**: @react-pdf/renderer / jsPDF
- **Email**: Resend
- **Test**: Playwright / Vitest

## 開発

```bash
npm install
cp .env.example .env.local  # 必要な環境変数を設定
npm run db:migrate:dev
npm run dev
```

## デプロイ

- main にマージされると `.github/workflows/deploy.yml` がビルドして本番の Worker `gikyoku-palette` に出す（主なページの 200 を確かめ、失敗したら直前の版に戻す）
- 手で出すとき: `npm run cf:build` → `npx opennextjs-cloudflare deploy`（`npx wrangler whoami` で個人の Cloudflare アカウントであることを確かめる）
- ローカルで Workers と同じ環境を試す: `.dev.vars` に秘密値を置き、`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` に DB の接続文字列を入れて `npx wrangler dev`
- 秘密値は Worker の secret（`wrangler secret`）。公開値は `wrangler.jsonc` の `vars`
- 上演許可の期限切れ処理（旧 vercel.json の cron）は `wrangler.jsonc` の `triggers.crons` → `worker.ts` の `scheduled()` が `/api/cron/expire-permissions` を呼ぶ
- PDF（@react-pdf/renderer）のレイアウトエンジン yoga の wasm は、Workers ではバイト列から組み立てられないため `patches/yoga-layout+*.patch` と `scripts/extract-yoga-wasm.mjs`（postinstall）で wasm モジュールとして読み込んでいる

## ステータス

本番公開中（palette.gikyokutosyokan.com）。
