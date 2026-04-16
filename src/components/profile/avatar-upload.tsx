"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  initialAvatarUrl: string | null;
  fallbackLabel: string;
};

/**
 * プロフィール編集ページに置くアバターアップロードUI。
 * クリックで file picker → /api/upload/avatar に POST → 即時プレビュー差し替え。
 * 失敗は文字でフィードバックする（控えめ）。
 */
export function AvatarUpload({ initialAvatarUrl, fallbackLabel }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "アップロードに失敗しました");
      }
      const data = (await res.json()) as { avatarUrl: string };
      setAvatarUrl(data.avatarUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className="group relative h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-gray-50"
        aria-label="アバター画像を変更"
      >
        <Avatar className="h-20 w-20">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt="" />
          ) : (
            <AvatarFallback>
              {fallbackLabel ? (
                fallbackLabel.slice(0, 1)
              ) : (
                <User className="h-8 w-8 text-gray-400" />
              )}
            </AvatarFallback>
          )}
        </Avatar>
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>
      </button>
      <div className="space-y-1 text-xs text-gray-500">
        <p>クリックして画像を選択</p>
        <p className="text-gray-400">PNG / JPEG / WebP・最大 5MB</p>
        {error && <p className="text-red-500">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={handleChange}
      />
    </div>
  );
}
