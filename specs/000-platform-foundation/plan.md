# Implementation Plan: Gikyoku Joen Platform

**Date**: 2026-03-17
**Specs**: 001〜005

## Summary

戯曲の投稿・公開・上演許可申請を統合的に提供するWebプラットフォーム。Next.js (App Router) + Supabase + Stripe Connect Express をVercel上にデプロイする。MVPでは認証、戯曲一覧/詳細/検索、上演許可申請（決済含む）、執筆者ダッシュボードを提供する。

## Technical Context

**Language/Version**: TypeScript 5.x
**Framework**: Next.js 15 (App Router, Server Components, Server Actions)
**Authentication**: Supabase Auth (Google OAuth, X/Twitter OAuth)
**Database**: Supabase PostgreSQL (with Row Level Security)
**ORM**: Prisma 6.x
**Payment**: Stripe Connect Express (Stripe SDK)
**Styling**: Tailwind CSS 4.x + shadcn/ui
**Email**: Supabase Edge Functions or Resend
**PDF Generation**: @react-pdf/renderer
**Testing**: Vitest + Playwright (E2E)
**Target Platform**: Web (Vercel)
**Performance Goals**: ページ表示 < 2秒、検索 < 1秒
**Constraints**: 日本語UI、モバイルファースト、WCAG 2.1 AA

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. ユーザー中心設計 | ✅ PASS | 3ペルソナ（執筆者/読者/上演希望者）を全spec で明示 |
| II. モダンWeb標準 | ✅ PASS | Next.js + Tailwind でレスポンシブ、shadcn/ui でアクセシビリティ |
| III. テスト重視 | ✅ PASS | Vitest + Playwright、決済・認証フローは必須テスト |
| IV. セキュリティ | ✅ PASS | Supabase RLS、Stripe決済、OAuth認証 |
| V. シンプルさ | ✅ PASS | 最小限のMVP、投稿エディタ/評価コメントはスコープ外 |

## Project Structure

```text
gikyoku-joen/
├── .specify/                    # Spec Kit
├── .claude/                     # Claude Code commands
├── specs/                       # Feature specifications
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # 認証関連ページ
│   │   │   ├── login/
│   │   │   └── auth/callback/
│   │   ├── (public)/            # 公開ページ
│   │   │   ├── page.tsx         # トップ（一覧）
│   │   │   ├── plays/
│   │   │   │   └── [id]/        # 戯曲詳細
│   │   │   └── authors/
│   │   │       └── [id]/        # 執筆者プロフィール
│   │   ├── (protected)/         # 認証必須ページ
│   │   │   ├── dashboard/       # ダッシュボード
│   │   │   │   ├── page.tsx     # 概要
│   │   │   │   ├── plays/       # 作品管理
│   │   │   │   ├── permissions/ # 申請管理
│   │   │   │   ├── sales/       # 売上
│   │   │   │   ├── stripe/      # Stripe連携
│   │   │   │   └── notifications/ # 通知
│   │   │   ├── permissions/
│   │   │   │   ├── new/[playId]/ # 申請フォーム
│   │   │   │   └── [id]/        # 申請詳細・決済
│   │   │   └── profile/
│   │   │       └── edit/        # プロフィール編集
│   │   ├── api/                 # API Routes
│   │   │   ├── webhooks/
│   │   │   │   └── stripe/      # Stripe Webhook
│   │   │   └── cron/
│   │   │       └── expire-permissions/ # 期限切れ処理
│   │   └── layout.tsx
│   ├── components/              # UIコンポーネント
│   │   ├── ui/                  # shadcn/ui ベース
│   │   ├── layout/              # Header, Footer, Sidebar
│   │   ├── plays/               # 戯曲関連コンポーネント
│   │   ├── permissions/         # 申請関連コンポーネント
│   │   └── dashboard/           # ダッシュボード関連
│   ├── lib/                     # ユーティリティ
│   │   ├── supabase/
│   │   │   ├── client.ts        # ブラウザ用クライアント
│   │   │   ├── server.ts        # サーバー用クライアント
│   │   │   └── middleware.ts    # 認証ミドルウェア
│   │   ├── stripe/
│   │   │   ├── client.ts        # Stripe SDK初期化
│   │   │   └── actions.ts       # Stripe関連Server Actions
│   │   └── utils.ts
│   ├── actions/                 # Server Actions
│   │   ├── auth.ts
│   │   ├── plays.ts
│   │   ├── permissions.ts
│   │   └── notifications.ts
│   └── types/                   # TypeScript型定義
│       └── index.ts
├── prisma/
│   ├── schema.prisma            # Prismaスキーマ
│   ├── migrations/
│   └── seed.ts                  # 初期データ投入
├── public/
│   └── images/
├── tests/
│   ├── unit/                    # Vitest
│   ├── integration/             # Vitest + Supabase
│   └── e2e/                     # Playwright
├── supabase/
│   └── config.toml              # Supabase CLI設定
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── vitest.config.ts
```

**Structure Decision**: Next.js App Router のRoute Groups `(auth)`, `(public)`, `(protected)` でレイアウトとアクセス制御を分離。Server Components + Server Actions パターンでデータフェッチとミューテーションを実装。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Stripe Connect Express | 執筆者への自動送金に必要 | 手動振込は運営コスト大 |
| Prisma + Supabase | ORM型安全 + RLSセキュリティ | 直接SQL は型安全でない |
