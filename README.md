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
- **Auth**: NextAuth.js v5 (beta) with Prisma adapter
- **DB**: PostgreSQL (Supabase)
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

## ステータス

MVP 実装済み、本番デプロイに向けて調整中。
