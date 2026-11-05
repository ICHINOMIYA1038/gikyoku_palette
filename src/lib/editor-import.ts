// 戯曲エディタから受け取る本文の検証（DB に触れない部分）。設計は台帳 docs/gikyoku-editor.md

export const EDITOR_URL = "https://editor.gikyokutosyokan.com";
/** 本文の上限。作品フォームの検証（playSchema）と同じ */
export const MAX_BODY_CHARS = 500_000;

export type ImportInput = { scriptId: string; revision: number; title?: string; body: string };

/** 受け取った本文を検証する。不正なら理由を返す */
export function parseImport(raw: unknown, needTitle: boolean): ImportInput | string {
  if (!raw || typeof raw !== "object") return "invalid_body";
  const r = raw as Record<string, unknown>;
  if (typeof r.scriptId !== "string" || r.scriptId.length === 0 || r.scriptId.length > 64) return "invalid_script_id";
  if (!Number.isInteger(r.revision) || (r.revision as number) < 1) return "invalid_revision";
  if (typeof r.body !== "string") return "invalid_body";
  if (r.body.length > MAX_BODY_CHARS) return "too_large";
  if (needTitle && (typeof r.title !== "string" || r.title.length > 200)) return "invalid_title";
  return {
    scriptId: r.scriptId,
    revision: r.revision as number,
    title: typeof r.title === "string" ? r.title.trim() || "無題の作品" : undefined,
    body: r.body,
  };
}
