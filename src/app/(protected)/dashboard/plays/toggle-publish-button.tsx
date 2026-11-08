"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { togglePublish } from "@/actions/plays";
import { Button } from "@/components/ui/button";

export function TogglePublishButton({
  playId,
  isPublished,
}: {
  playId: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [published, setPublished] = useState(isPublished);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 送れなかったとき（サーバーが 503 を返したときなど）は表示を変えずに知らせる。
  // 以前は失敗しても表示だけが切り替わり、読み込み直すと元に戻るので「押しても変わらない」に見えていた
  const handleToggle = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await togglePublish(playId);
      if (result.success) {
        setPublished(result.isPublished);
        // 一覧の「公開中」「下書き」の札もサーバーの状態に合わせる
        router.refresh();
      } else {
        setError(result.error || "切り替えられませんでした");
      }
    } catch {
      setError("通信に失敗しました。もう一度お試しください");
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        variant={published ? "destructive" : "default"}
        size="sm"
        onClick={handleToggle}
        disabled={loading}
      >
        {loading ? "処理中..." : published ? "非公開にする" : "公開する"}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
