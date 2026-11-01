// yoga-layout（@react-pdf/renderer のレイアウトエンジン）の wasm を、同梱の base64 から .wasm ファイルとして取り出す。
// Cloudflare Workers では wasm をバイト列から組み立てられないので、wrangler にモジュールとして束ねてもらうためのファイルが要る。
// postinstall で実行する（patches/yoga-layout+*.patch の load.js がこのファイルを import する）。
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
// exports で dist/ 以下が隠されているので、公開されている入口（dist/src/index.js）から辿る
const binaries = join(dirname(dirname(require.resolve("yoga-layout"))), "binaries");
const source = readFileSync(join(binaries, "yoga-wasm-base64-esm.js"), "utf8");
const match = source.match(/data:application\/octet-stream;base64,([A-Za-z0-9+/=]+)/);
if (!match) throw new Error("yoga-layout: base64 の wasm が見つからない（パッケージの形が変わった）");
const bytes = Buffer.from(match[1], "base64");
if (bytes.subarray(0, 4).toString("binary") !== "\0asm") throw new Error("yoga-layout: 取り出した内容が wasm ではない");
const out = join(binaries, "yoga.wasm");
if (!existsSync(out) || !readFileSync(out).equals(bytes)) writeFileSync(out, bytes);
console.log(`yoga.wasm: ${bytes.length} bytes → ${out}`);
