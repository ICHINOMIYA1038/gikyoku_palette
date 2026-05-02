import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function EditorRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/editor/${id}`);
}
