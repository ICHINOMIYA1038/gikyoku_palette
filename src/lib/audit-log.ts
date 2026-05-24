export async function logSecurityEvent(event: {
  type: "login" | "login_failed" | "upload" | "permission_request" | "settings_change";
  userId?: string;
  ip?: string;
  details?: string;
}) {
  // 構造化ログ。Vercel のログ収集が拾えるよう warn 経由で出す（console.log は eslint で禁止）。
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    audit: true,
    timestamp: new Date().toISOString(),
    ...event,
  }));
}
