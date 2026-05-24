/**
 * Server Action の戻り値型を統一する。
 *
 * これまで各 action が `{ error?: string }` `{ success: true, id: string }` などを
 * バラバラに返していたが、`ActionResult<T>` で型を一本化することで
 * 呼び出し側（フォーム / useActionState）が安全に判定できるようになる。
 *
 * 失敗時に入力値を返したい場合は `fieldErrors` / `values` を付与する。
 */
import type { FormValues } from "@/lib/form-values";
import { extractFormValues } from "@/lib/form-values";
import type { ZodError } from "zod";

export type ActionSuccess<T = void> = T extends void
  ? { success: true }
  : { success: true } & T;

export type ActionFailure = {
  success?: false;
  error: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: FormValues;
};

export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;

export function ok(): ActionSuccess<void>;
export function ok<T extends Record<string, unknown>>(data: T): ActionSuccess<T>;
export function ok<T extends Record<string, unknown>>(data?: T): ActionResult<T> {
  return { success: true, ...(data ?? ({} as T)) } as ActionSuccess<T>;
}

export function fail(error: string, extras?: Omit<ActionFailure, "error">): ActionFailure {
  return { success: false, error, ...extras };
}

export function isSuccess<T>(result: ActionResult<T>): result is ActionSuccess<T> {
  return result.success === true;
}

/**
 * zod の失敗結果を ActionFailure に変換する。
 * フォーム再描画用に values も同梱する。
 */
export function zodFailure(error: ZodError, formData: FormData): ActionFailure {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const first = Object.entries(fieldErrors).find(([, v]) => v && v.length > 0);
  const summary = first
    ? `${first[0]}: ${first[1]![0]}`
    : "入力内容に誤りがあります";
  return fail(summary, {
    fieldErrors,
    values: extractFormValues(formData),
  });
}
