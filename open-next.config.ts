import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// ページはすべて force-dynamic で ISR を使っていないので、キャッシュの置き場（R2 / Durable Object）は持たない
export default defineCloudflareConfig({});
