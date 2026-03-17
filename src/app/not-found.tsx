import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4">
      <h1 className="mb-2 text-4xl font-bold">404</h1>
      <p className="mb-6 text-muted-foreground">
        ページが見つかりませんでした
      </p>
      <Button render={<Link href="/" />}>トップページに戻る</Button>
    </div>
  );
}
