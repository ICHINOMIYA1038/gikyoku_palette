// Cloudflare Workers の入口。OpenNext が作る .open-next/worker.js に、cron（上演許可の期限切れ処理）を足す。
// Vercel では vercel.json の crons が /api/cron/expire-permissions を叩いていた。Workers では triggers.crons で
// scheduled() が呼ばれるので、同じ API を Worker の中から（ネットワークに出ずに）呼ぶ。
// .open-next はビルドで作られるので、このファイルは tsconfig の対象から外している（wrangler が束ねる）
import handler from "./.open-next/worker.js";

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

type Env = { CRON_SECRET?: string; AUTH_URL?: string };

export default {
  fetch: handler.fetch,

  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    const base = env.AUTH_URL || "https://palette.gikyokutosyokan.com";
    const request = new Request(`${base}/api/cron/expire-permissions`, {
      headers: { authorization: `Bearer ${env.CRON_SECRET ?? ""}` },
    });
    // 失敗（鍵の不一致の 401 や 500）を console.log のままにすると、止まり続けても気づけない。
    // console.error にして error-notifier（Slack の #x-errors）に出す
    try {
      const response: Response = await handler.fetch(request, env, ctx);
      const line = `cron expire-permissions: HTTP ${response.status} ${(await response.text()).slice(0, 500)}`;
      if (response.ok) console.log(line);
      else console.error(line);
    } catch (e) {
      console.error("cron expire-permissions: 実行できなかった", e);
    }
  },
};
