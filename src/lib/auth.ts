// ログインは戯曲 ID（ポータル）に移した（2026-11-01）。next-auth は使わない。
// 呼び出し側が使うのは `auth()`（session.user.id）と `signOut()` だけなので、名前はそのまま残す。
export { auth, signOut } from "@/lib/gikyoku-id";
