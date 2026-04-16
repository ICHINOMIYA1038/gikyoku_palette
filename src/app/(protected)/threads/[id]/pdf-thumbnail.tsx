"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { formatBytes } from "@/lib/attachment-policy";

type Props = {
  url: string;
  fileName: string;
  fileSize: number;
};

/**
 * PDF添付の軽量サムネイル。
 * pdfjs-dist で1ページ目を canvas に描画し、クリックで新規タブで開く。
 * 描画失敗時はファイル名チップにフォールバックする。
 */
export function PdfThumbnail({ url, fileName, fileSize }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfjs.getDocument({ url, isEvalSupported: false }).promise;
        const page = await doc.getPage(1);
        if (cancelled) return;

        const targetWidth = 220;
        const baseVp = page.getViewport({ scale: 1 });
        const scale = targetWidth / baseVp.width;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (status === "error") {
    // フォールバック: 普通のファイルチップ
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 shadow-sm hover:bg-gray-50"
      >
        <FileText className="h-4 w-4 text-gray-400" />
        <span className="max-w-[200px] truncate font-medium">{fileName}</span>
        <span className="text-gray-400">{formatBytes(fileSize)}</span>
        <Download className="h-3 w-3 text-gray-400" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block w-fit overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-opacity hover:opacity-90"
    >
      <div className="relative">
        {status === "loading" && (
          <div className="flex h-[300px] w-[220px] items-center justify-center bg-gray-50">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        )}
        <canvas ref={canvasRef} className={status === "loading" ? "hidden" : "block"} />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-2 py-1.5 text-[10px] text-gray-600">
        <span className="flex items-center gap-1 truncate">
          <FileText className="h-3 w-3 text-gray-400" />
          {fileName}
        </span>
        <span className="text-gray-400">{formatBytes(fileSize)}</span>
      </div>
    </a>
  );
}
