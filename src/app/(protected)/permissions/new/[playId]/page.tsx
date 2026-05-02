import { redirect } from "next/navigation";

export const metadata = { title: "上演許可申請（準備中）" };

type Props = { params: Promise<{ playId: string }> };

export default async function NewPermissionPage({ params }: Props) {
  const { playId } = await params;
  redirect(`/plays/${playId}`);
}
