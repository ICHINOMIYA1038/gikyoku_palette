export async function logSecurityEvent(event: {
  type: "login" | "login_failed" | "upload" | "permission_request" | "settings_change";
  userId?: string;
  ip?: string;
  details?: string;
}) {
  // Log to console in structured format for Vercel logs
  console.log(JSON.stringify({
    audit: true,
    timestamp: new Date().toISOString(),
    ...event,
  }));
}
