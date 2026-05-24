/**
 * LP に貼り付ける UI スクショを撮影するスクリプト。
 *
 *   npm run capture:lp                # palette.gikyokutosyokan.com を本番想定で撮影
 *   npm run capture:lp -- --base=http://localhost:3000
 *
 * 初回は Google ログイン画面が出るので手で完了してください（30秒待機）。
 * 認証クッキーは scripts/.lp-auth/ に永続化され、2回目以降は自動でログイン状態。
 */
import { chromium, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public/landing");
const AUTH_DIR = path.join(__dirname, ".lp-auth");

function argv(name: string, fallback: string): string {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? m.slice(name.length + 3) : fallback;
}

const BASE = argv("base", "https://palette.gikyokutosyokan.com");

async function shot(
  page: Page,
  filename: string,
  selector: string,
  opts: { padding?: number } = {}
) {
  const el = await page.waitForSelector(selector, { timeout: 15_000 });
  const box = await el.boundingBox();
  if (!box) throw new Error(`no bounding box for ${selector}`);
  const pad = opts.padding ?? 12;
  await page.screenshot({
    path: path.join(OUT, filename),
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    },
  });
  console.log(`✓ ${filename}`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Retina 相当
  });
  const page = await context.newPage();

  // 1. ログイン確認
  await page.goto(`${BASE}/dashboard`);
  if (page.url().includes("/login")) {
    console.log("⚠ 未ログインです。表示されたウィンドウで Google ログインを完了してください。");
    console.log("  完了したら 60 秒以内に dashboard へ自動遷移します…");
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    console.log("✓ ログイン完了");
  }

  // 2. ホーム（人気の作品セクション）
  await page.goto(BASE);
  await shot(page, "1-search.png", "section:has(.container) >> nth=1");

  // 3. 上演許可申請フォーム — 最初に見つかった公開作品で
  await page.goto(`${BASE}/`);
  const playLink = await page.$('a[href^="/plays/"]');
  if (!playLink) throw new Error("公開作品が無いので #2/#3 撮影不可");
  const playHref = await playLink.getAttribute("href");
  const playId = playHref!.split("/").pop()!;

  await page.goto(`${BASE}/permissions/new/${playId}`);
  await shot(page, "2-apply.png", "form");

  // 4. スレッド — 進行中スレッド一覧から1つ
  await page.goto(`${BASE}/threads`);
  const thread = await page.$('a[href^="/threads/"]');
  if (!thread) {
    console.log("⚠ スレッドが無いので #3/#4 はスキップ");
    await context.close();
    return;
  }
  const threadHref = await thread.getAttribute("href");
  await page.goto(`${BASE}${threadHref}`);

  // 振込先 (TransferPanel) or 許可証 (info-panel 内) のどちらかを撮影
  const transfer = await page.$('div:has(> p:text("お振込み"))');
  if (transfer) {
    await shot(page, "3-transfer.png", 'div:has(> p:text("お振込み"))');
  }
  const cert = await page.$('div:has(> div > p:text("許可証発行済み"))');
  if (cert) {
    await shot(page, "4-certificate.png", 'div:has(> div > p:text("許可証発行済み"))');
  }

  await context.close();
  console.log(`\n✓ 保存先: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
