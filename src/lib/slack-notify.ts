/**
 * 運営への知らせ（pairof の Slack の種類ごとのチャンネル）。
 * 利用者の操作を止めないこと：送り先が未設定なら何もせず、失敗しても例外を外に出さない。
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";

const APP_NAME = "戯曲パレット";
// 運営が開くリンクなので本番に固定する（リクエストの Host は利用者が変えられる）
const SITE_ORIGIN = "https://palette.gikyokutosyokan.com";
const TIMEOUT_MS = 5000;

/** 利用者が入力した文字を Slack の mrkdwn に入れる前に通す（リンクやメンションの記法にさせない） */
export function escapeSlack(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type SlackMessage = { emoji: string; summary: string; body: string };

async function post(webhookUrl: string, { emoji, summary, body }: SlackMessage): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `[${APP_NAME}] ${emoji} ${summary}`,
        blocks: [
          { type: "context", elements: [{ type: "mrkdwn", text: `*${APP_NAME}*` }] },
          { type: "section", text: { type: "mrkdwn", text: body } },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) console.error(`Slack への知らせ（#x-posts）に失敗: HTTP ${response.status}`);
  } catch (e) {
    // Webhook の URL は秘密なので、例外の中身のうち名前だけを残す
    console.error("Slack への知らせ（#x-posts）に失敗:", e instanceof Error ? e.name : "unknown");
  }
}

/** 利用者の投稿を #x-posts に知らせる。応答を待たせないよう、Workers では waitUntil に預ける */
function notifyPosts(message: SlackMessage): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL_POSTS;
  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL_POSTS が未設定のため、#x-posts への知らせを送らない");
    return Promise.resolve();
  }
  const sending = post(webhookUrl, message);
  try {
    getCloudflareContext().ctx.waitUntil(sending);
  } catch {
    // Node.js で動いているとき（next dev・テスト）は、そのまま送り終わるのを待たずに進む
  }
  return sending;
}

/** 戯曲が公開された（非公開→公開）ことを知らせる */
export function notifyPlayPublished(play: {
  id: string;
  title: string;
  authorName: string;
  republished: boolean;
}): Promise<void> {
  const title = escapeSlack(play.title);
  const label = play.republished ? "戯曲が再び公開されました" : "戯曲が公開されました";
  return notifyPosts({
    emoji: "📖",
    summary: `${label}：「${title}」`,
    body: [
      `*${label}*`,
      `題：${title}`,
      `作者：${escapeSlack(play.authorName)}`,
      `<${SITE_ORIGIN}/plays/${encodeURIComponent(play.id)}>`,
    ].join("\n"),
  });
}
