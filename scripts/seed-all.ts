/**
 * ローカル開発用の統合シードランナー。
 * 順番:
 *   1. ジャンル(palette_genres)
 *   2. サンプルユーザー + 作品 + ジャンル紐付け + レビュー
 *   3. 各ステータスの permission + thread + system messages
 *
 * 既存データはアプリ側で重複防止 / upsert / DROP扱いされる前提。
 * ローカル DB を完全リセットしたい場合は migration_production_v2.sql を再実行してから本スクリプトを叩く。
 *
 * 実行:
 *   set -a && source .env.development.local && set +a
 *   npx tsx scripts/seed-all.ts
 */

import { execSync } from "node:child_process";

const steps: Array<{ name: string; cmd: string }> = [
  { name: "ジャンル投入",         cmd: "npx tsx prisma/seed.ts" },
  { name: "サンプル作品/レビュー", cmd: "npx tsx prisma/seed-sample.ts" },
  { name: "Permission各ステータス", cmd: "npx tsx scripts/seed-permission-states.ts" },
];

let failed = 0;
for (const s of steps) {
  console.log(`\n=== ${s.name} ===`);
  try {
    execSync(s.cmd, { stdio: "inherit" });
  } catch (e) {
    console.error(`✗ ${s.name} で失敗:`, (e as Error).message);
    failed++;
  }
}

console.log("\n=== 完了 ===");
console.log(failed === 0 ? "全ステップ成功" : `${failed} 件失敗 (上のログを参照)`);
process.exit(failed === 0 ? 0 : 1);
