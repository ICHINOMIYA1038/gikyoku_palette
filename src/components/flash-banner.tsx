import { Banner } from "@/components/ui/banner";

/**
 * URL クエリパラメータからフラッシュメッセージを表示する。
 *
 * 例:
 *   /dashboard/plays?created=1      → 「作成が完了しました。」
 *   /dashboard/plays?updated=1      → 「更新しました。」
 *   /dashboard/plays?deleted=1      → 「削除しました。」
 *   /dashboard/plays?error=xxx      → エラーメッセージを赤バナーで表示
 *
 * 使い方:
 *   const sp = await searchParams;
 *   return <FlashBanner params={sp} />;
 */
type FlashParams = {
  created?: string;
  updated?: string;
  deleted?: string;
  saved?: string;
  error?: string;
  message?: string;
};

const SUCCESS_MESSAGES: Record<string, string> = {
  created: "作成が完了しました。",
  updated: "更新しました。",
  deleted: "削除しました。",
  saved: "保存しました。",
};

export function FlashBanner({ params, className = "mb-4" }: { params: FlashParams; className?: string }) {
  if (params.error) {
    return (
      <Banner variant="error" className={className}>
        {params.error}
      </Banner>
    );
  }

  const successKey = (Object.keys(SUCCESS_MESSAGES) as (keyof typeof SUCCESS_MESSAGES)[]).find(
    (k) => params[k as keyof FlashParams] === "1"
  );
  if (successKey) {
    return (
      <Banner variant="success" className={className}>
        {params.message || SUCCESS_MESSAGES[successKey]}
      </Banner>
    );
  }

  return null;
}
