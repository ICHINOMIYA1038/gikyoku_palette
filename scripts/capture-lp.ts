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
  opts: { padding?: number; maxHeight?: number } = {}
) {
  const el = await page.waitForSelector(selector, { timeout: 15_000 });
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  // 要素単体をキャプチャ (clipの座標問題を回避)
  await el.screenshot({ path: path.join(OUT, filename) });
  console.log(`✓ ${filename}`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    headless: false,
    channel: "chrome", // Google OAuth が Playwright Chromium を弾くため実 Chrome を使う
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Retina 相当
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = await context.newPage();

  // 1. ログイン確認
  await page.goto(`${BASE}/dashboard`);
  if (page.url().includes("/login")) {
    console.log("⚠ 未ログインです。表示されたウィンドウで Google ログインを完了してください。");
    console.log("  完了したら 5 分以内に dashboard へ自動遷移します…");
    await page.waitForURL(/\/dashboard/, { timeout: 300_000 });
    console.log("✓ ログイン完了");
  }

  // 1. ホーム（人気の作品セクション）
  await page.goto(BASE);
  await page.waitForLoadState("networkidle");
  // "人気の作品" を含む panel を撮影
  await shot(page, "1-search.png", 'div:has(> div > h2:text("人気の作品")), div:has(> h2:text("人気の作品"))').catch(async () => {
    // フォールバック: ニュース横の中央カラム全体
    await shot(page, "1-search.png", "main");
  });

  // 2. 上演許可申請フォーム
  const playLink = await page.$('a[href^="/plays/"]');
  if (!playLink) {
    console.log("⚠ 公開作品が無いので #2/#3 撮影不可");
  } else {
    const playHref = await playLink.getAttribute("href");
    const playId = playHref!.split("/").pop()!;
    await page.goto(`${BASE}/permissions/new/${playId}`);
    await page.waitForLoadState("networkidle");
    await shot(page, "2-apply.png", "form");
  }

  // 3. スレッド
  await page.goto(`${BASE}/threads`);
  await page.waitForLoadState("networkidle");
  const thread = await page.$('a[href^="/threads/"]');
  if (!thread) {
    console.log("⚠ スレッドが無いので #3/#4 はスキップ");
    await context.close();
    return;
  }
  const threadHref = await thread.getAttribute("href");
  await page.goto(`${BASE}${threadHref}`);
  await page.waitForLoadState("networkidle");

  // 振込先パネル or 許可証発行カード
  for (const [text, file] of [
    ["お振込み", "3-transfer.png"],
    ["許可証発行済み", "4-certificate.png"],
  ] as const) {
    const sel = `div:has(> p:text("${text}"))`;
    const el = await page.$(sel);
    if (el) {
      await shot(page, file, sel).catch((e) => console.log(`× ${file}: ${e.message}`));
    } else {
      console.log(`⚠ "${text}" 要素が見つからないので ${file} スキップ`);
    }
  }

  await context.close();
  console.log(`\n✓ 保存先: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
