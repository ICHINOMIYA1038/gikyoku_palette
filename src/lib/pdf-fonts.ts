import { Font } from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// @react-pdf/renderer に日本語フォント（Noto Sans JP。public/fonts に同梱）を登録する。
// @react-pdf の `src` は URL / 絶対パス / Data URL を受け付け、Buffer は受け付けないため Data URL にする。
// Cloudflare Workers にはファイルシステムが無いので静的アセット（ASSETS バインディング）から読み、
// next dev / next build（Node.js）では fs で読む。最初に使うときに 1 回だけ読んで使い回す。
// 以前は作品 PDF が jsDelivr から毎回フェッチしていて、Vercel ではタイムアウト（504）していた。
export const PDF_FONT_FAMILY = "NotoSansJP";

const FONT_DIR = path.join(process.cwd(), "public/fonts/noto-sans-jp");
// TTF を使う（WOFF だと毎回 JS で伸長する分だけ遅い。ファイルは public/fonts/noto-sans-jp に両方ある）
const FONT_FILES = { normal: "regular.ttf", bold: "bold.ttf" } as const;

async function loadFontDataUrl(filename: string): Promise<string> {
  let bytes: Uint8Array;
  let assets: { fetch(input: Request | string): Promise<Response> } | undefined;
  try {
    assets = (getCloudflareContext().env as { ASSETS?: typeof assets }).ASSETS;
  } catch {
    // Node.js
  }
  if (assets) {
    const res = await assets.fetch(`https://assets.local/fonts/noto-sans-jp/${filename}`);
    if (!res.ok) throw new Error(`font asset not found: ${filename} (HTTP ${res.status})`);
    bytes = new Uint8Array(await res.arrayBuffer());
  } else {
    bytes = fs.readFileSync(path.join(FONT_DIR, filename));
  }
  return `data:font/ttf;base64,${Buffer.from(bytes).toString("base64")}`;
}

let registered: Promise<void> | undefined;

/** PDF を描く前に 1 回 await する。失敗したら次の呼び出しでやり直す */
export function ensurePdfFonts(): Promise<void> {
  if (!registered) {
    registered = (async () => {
      const [normal, bold] = await Promise.all([loadFontDataUrl(FONT_FILES.normal), loadFontDataUrl(FONT_FILES.bold)]);
      Font.register({
        family: PDF_FONT_FAMILY,
        fonts: [
          { src: normal, fontWeight: "normal" },
          { src: bold, fontWeight: "bold" },
        ],
      });
    })().catch((e) => {
      registered = undefined;
      throw e;
    });
  }
  return registered;
}
