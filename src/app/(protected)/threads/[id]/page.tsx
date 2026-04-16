import { notFound } from "next/navigation";
import { getThreadDetail } from "@/actions/threads";
import { ThreadView } from "./thread-view";

export const metadata = { title: "スレッド" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/**
 * スレッド詳細ページ。
 * 認可チェック済みの detail を client component に渡し、ポーリングで更新させる。
 */
export default async function ThreadPage({ params }: Props) {
  const { id } = await params;
  const detail = await getThreadDetail(id);
  if (!detail) notFound();

  return <ThreadView initial={detail} />;
}
