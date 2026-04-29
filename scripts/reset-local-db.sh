#!/usr/bin/env bash
# ローカル開発DBの palette schema を一旦完全に消して再構築する。
# その後、テストデータを seed-all.ts で流す。
#
# 使い方:
#   ./scripts/reset-local-db.sh
#   または
#   bash scripts/reset-local-db.sh

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.development.local ]; then
  echo "✗ .env.development.local が見つかりません" >&2
  exit 1
fi

# DIRECT_URL を読む(クエリパラメータは psql 用に剥がす)
set -a
# shellcheck disable=SC1091
source .env.development.local
set +a

DB_URL_RAW="${DIRECT_URL:?DIRECT_URL not set}"
DB_URL="${DB_URL_RAW%%\?*}"

echo "=== ターゲット: $DB_URL ==="
read -rp "本当に palette schema を DROP しますか? (yes/N): " ANS
[ "$ANS" = "yes" ] || { echo "中止"; exit 1; }

echo "=== Step 1: palette schema を DROP & 再作成 ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS palette CASCADE;
SQL

echo "=== Step 2: マイグレーション SQL を適用 ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 -f prisma/migration_production_v2.sql

echo "=== Step 3: Prisma Client 再生成 ==="
npx prisma generate

echo "=== Step 4: テストデータ投入 ==="
npx tsx scripts/seed-all.ts

echo ""
echo "=== 完了 ==="
echo "ローカル DB を palette schema でリセットしました"
