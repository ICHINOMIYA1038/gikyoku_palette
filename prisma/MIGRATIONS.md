# Prisma マイグレーション運用

このディレクトリは Prisma マイグレーションへの段階的移行のための基盤です。

## 現状

- `prisma/migrations/0_init/migration.sql` — 現在の `schema.prisma` から再生成したベースライン
- `prisma/migration_*.sql` — 旧運用の手書きSQL（参考のため残置）

## 移行手順（DB管理者向け）

### ローカル開発DB

```bash
# 1) .env を読み込んだ上で
set -a && source .env.development.local && set +a

# 2) ベースラインを「適用済み」として記録（既にスキーマが当たっている前提）
npx prisma migrate resolve --applied 0_init

# 3) 以後は通常のフローで
npx prisma migrate dev --name <変更内容>
```

### 本番 (Supabase)

**まず staging 環境で検証してから本番に適用すること。**

```bash
# 1) 本番DBに向けて
DATABASE_URL=$PROD_DATABASE_URL DIRECT_URL=$PROD_DIRECT_URL \
  npx prisma migrate resolve --applied 0_init

# 2) 以後の変更
DATABASE_URL=$PROD_DATABASE_URL DIRECT_URL=$PROD_DIRECT_URL \
  npx prisma migrate deploy
```

## 新規マイグレーション作成のルール

1. `schema.prisma` を編集
2. `npx prisma migrate dev --name <短い説明>` で migration ファイルを生成（ローカルに即適用される）
3. 生成された `prisma/migrations/<timestamp>_<name>/migration.sql` をコミット
4. CI 経由で `prisma migrate deploy` を本番に適用

## 旧 SQL ファイル

`prisma/migration_palette.sql`, `migration_production*.sql`, `migration_nullable_performance_fields.sql`
は移行作業のリファレンスとして残してあるが、新規マイグレーションには使わない。
移行完了後にディレクトリ整理する。
