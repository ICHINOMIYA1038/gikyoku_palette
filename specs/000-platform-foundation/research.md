# Research: Gikyoku Joen Platform

## 技術選定

### Next.js 15 (App Router)

**Decision**: Next.js 15 を App Router + Server Components で使用
**Rationale**: SSR/SSG によるSEO最適化、Server Components によるパフォーマンス向上、Server Actions によるフォーム処理の簡素化。Vercelへのデプロイが最も容易。
**Alternatives considered**: Nuxt.js (Vue) - チームのReact経験を優先, Remix - Vercelとの統合度がNext.jsに劣る

### Supabase

**Decision**: Supabase を認証 + データベース + リアルタイム通知に使用
**Rationale**: PostgreSQL ベースでRLS（行レベルセキュリティ）が使える。Auth機能が組み込みでOAuth対応。リアルタイムサブスクリプションで通知機能に活用可能。無料枠が開発には十分。
**Alternatives considered**: Firebase - RDBが使えない, Auth0 + 自前DB - コスト高

### Prisma

**Decision**: Prisma をORMとして使用
**Rationale**: TypeScript との型安全な統合。マイグレーション管理。Supabase PostgreSQL との互換性あり。
**Alternatives considered**: Drizzle ORM - 軽量だがエコシステムが小さい, Supabase JS Client 直接 - 型安全でない
**Note**: Supabase の RLS は Prisma 経由では直接使えないため、API Routes/Server Actions では Supabase Client を認証チェックに使い、データアクセスは Prisma を使う二層構成とする。

### Stripe Connect Express

**Decision**: Stripe Connect Express でマーケットプレイス型決済
**Rationale**: 執筆者への自動送金、プラットフォーム手数料の自動控除、Expressアカウントで執筆者のオンボーディング負担を軽減。
**Alternatives considered**: Stripe Connect Standard - 執筆者の負担が大きい, 手動振込 - 運営コストが高い

### shadcn/ui + Tailwind CSS

**Decision**: UIコンポーネントに shadcn/ui、スタイリングに Tailwind CSS を使用
**Rationale**: コピー&ペーストベースでカスタマイズ自由。アクセシビリティ(Radix UI ベース)対応。Tailwind でレスポンシブ・モバイルファースト。
**Alternatives considered**: MUI - 重量級, Chakra UI - Tailwindとの併用が難しい

### メール通知

**Decision**: Resend を使用
**Rationale**: Next.js との統合が容易。React Email でテンプレート管理可能。無料枠で月100通（MVP初期には十分）。
**Alternatives considered**: Supabase Edge Functions + SMTP - 設定が複雑, SendGrid - 無料枠が縮小傾向

### PDF生成

**Decision**: @react-pdf/renderer を使用
**Rationale**: React コンポーネントとしてPDFテンプレートを定義可能。サーバーサイドで生成可能。日本語フォント対応可能。
**Alternatives considered**: Puppeteer - 重量級、Vercelの制約に引っかかる可能性, jsPDF - 日本語対応が弱い

## 全文検索

**Decision**: Supabase PostgreSQL の `tsvector` + `to_tsquery` を使用
**Rationale**: 外部サービス不要。日本語対応には `pg_bigm` 拡張（バイグラムインデックス）を使用。Supabase は pg_bigm をサポートしている。
**Alternatives considered**: Algolia - コスト高, Meilisearch - 別途ホスティング必要

## Cron ジョブ（期限切れ処理）

**Decision**: Vercel Cron Jobs を使用
**Rationale**: vercel.json でスケジュール定義可能。API Route をトリガーするだけのシンプルな構成。承認から30日後の期限切れ処理に使用。
**Alternatives considered**: Supabase Edge Functions + pg_cron - 設定が複雑

## 認証フロー詳細

### Google OAuth
1. ユーザーが「Googleでログイン」をクリック
2. Supabase Auth が Google OAuth 2.0 フローを開始
3. Google認証画面でユーザーが許可
4. コールバックで Supabase がセッション作成
5. 初回ログインの場合、`public.users` にレコード作成（Supabase Database Trigger）
6. プロフィール設定画面にリダイレクト（初回のみ）

### X (Twitter) OAuth
1. 同上のフロー（プロバイダーがXに変わるだけ）
2. Supabase Auth が X OAuth 2.0 (PKCE) フローを処理

### アカウントリンク
- Supabase Auth の設定で、同一メールアドレスのアカウントを自動リンク
