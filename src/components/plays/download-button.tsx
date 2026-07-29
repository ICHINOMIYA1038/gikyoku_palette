"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import Link from "next/link";

type DownloadButtonProps = {
  playId: string;
  title: string;
  hasBody: boolean;
  bodyType?: string;
  bodyPdfUrl?: string | null;
};

export function DownloadButton({ playId, title, hasBody, bodyType, bodyPdfUrl }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plays/${playId}/download`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "ダウンロードに失敗しました");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("ダウンロードに失敗しました");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!hasBody) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled className="gap-2">
          <DownloadIcon />
          本文未登録
        </Button>
      </div>
    );
  }

  if (bodyType === "pdf" && bodyPdfUrl) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={bodyPdfUrl}
          download={`${title}.pdf`}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <DownloadIcon />
          PDFダウンロード
        </a>
        <a
          href={bodyPdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <PdfIcon />
          PDFで見る
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <Banner variant="error">{error}</Banner>}
      <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        onClick={handleDownload}
        disabled={isDownloading}
        className="gap-2"
      >
        <DownloadIcon />
        {isDownloading ? "ダウンロード中..." : "テキストDL"}
      </Button>
      <Link
        href={`/plays/${playId}/print`}
        className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <PrintIcon />
        印刷
      </Link>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}
