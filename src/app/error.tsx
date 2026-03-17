"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4">
      <h1 className="mb-2 text-4xl font-bold">エラー</h1>
      <p className="mb-6 text-muted-foreground">
        予期しないエラーが発生しました
      </p>
      <Button onClick={reset}>もう一度試す</Button>
    </div>
  );
}
