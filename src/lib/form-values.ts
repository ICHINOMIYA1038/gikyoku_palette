/**
 * FormData を再生成可能な単純レコードに変換する。
 * 同名キーが複数あった場合は配列で保持する（genreIds など）。
 * File は扱わない（アップロードは別経路）。
 *
 * サーバアクションが validation 失敗したときに返し、
 * クライアント側で defaultValue の fallback として使うと、
 * ユーザーが入力した内容を失わずに済む。
 */

export type FormValues = Record<string, string | string[]>;

export function extractFormValues(formData: FormData): FormValues {
  const out: FormValues = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    const v = String(value);
    const existing = out[key];
    if (existing === undefined) {
      out[key] = v;
    } else if (Array.isArray(existing)) {
      existing.push(v);
    } else {
      out[key] = [existing, v];
    }
  }
  return out;
}

/** 値が配列でも string でも安全に最初の要素を string として取り出す */
export function firstString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/** genreIds など配列キーの取り出し */
export function asArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}
