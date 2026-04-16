"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

type CoverImageUploadProps = {
  currentImageUrl?: string | null;
  onUpload: (imageUrl: string) => void;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function CoverImageUpload({
  currentImageUrl,
  onUpload,
}: CoverImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(
    currentImageUrl || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("JPEG、PNG、WebP形式の画像のみ対応しています。");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("ファイルサイズは5MB以下にしてください。");
        return;
      }

      // Show preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      setIsUploading(true);
      try {
        // multipart で直接サーバへ送信（/api/upload-cover が保存＋公開URLを返す）
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload-cover", { method: "POST", body: fd });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "アップロードに失敗しました");
        }

        const { imageUrl } = (await res.json()) as { imageUrl: string };
        setPreview(imageUrl);
        onUpload(imageUrl);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "アップロードに失敗しました"
        );
        // Revert preview on error
        setPreview(currentImageUrl || null);
      } finally {
        setIsUploading(false);
      }
    },
    [currentImageUrl, onUpload]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">カバー画像</label>
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-md">
            <Image
              src={preview}
              alt="カバー画像プレビュー"
              fill
              className="object-cover"
              unoptimized={preview.startsWith("blob:")}
            />
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-muted-foreground">
              クリックまたはドラッグ&ドロップで画像を選択
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPEG / PNG / WebP（5MB以下）
            </p>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
            <p className="text-sm font-medium">アップロード中...</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {preview && !isUploading && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground underline"
          onClick={(e) => {
            e.stopPropagation();
            setPreview(null);
            onUpload("");
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          画像を削除
        </button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
