"use client";
import { useState } from "react";

type BodyType = "text" | "pdf";
type Orientation = "portrait" | "landscape";
type ReadingDirection = "ltr" | "rtl";

type Props = {
  initialType?: BodyType;
  initialBody?: string;
  initialPdfUrl?: string | null;
  initialOrientation?: Orientation;
  initialReadingDirection?: ReadingDirection;
};

async function detectPdfOrientation(file: File): Promise<Orientation> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });

    return viewport.width > viewport.height ? "landscape" : "portrait";
  } catch {
    return "portrait";
  }
}

export function BodyTypeSelector({
  initialType = "text",
  initialBody = "",
  initialPdfUrl = null,
  initialOrientation = "portrait",
  initialReadingDirection = "ltr",
}: Props) {
  const [bodyType, setBodyType] = useState<BodyType>(initialType);
  const [orientation, setOrientation] = useState<Orientation>(initialOrientation);
  const [readingDirection, setReadingDirection] =
    useState<ReadingDirection>(initialReadingDirection);
  const [pdfUrl, setPdfUrl] = useState<string>(initialPdfUrl || "");
  const [uploading, setUploading] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string>("");

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // MIME か 拡張子のどちらかで PDF と判定できればOK
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      alert("PDFファイルを選択してください");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert("20MB以下のPDFを選択してください");
      return;
    }

    setUploading(true);
    setPdfFileName(file.name);
    try {
      // PDFの向きを自動判定
      const detectedOrientation = await detectPdfOrientation(file);
      setOrientation(detectedOrientation);

      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-pdf", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "アップロードに失敗しました");
      }
      const { pdfUrl: url } = await res.json();
      setPdfUrl(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "アップロードに失敗しました");
      setPdfFileName("");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* フォーマット切替 */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        <button
          type="button"
          onClick={() => setBodyType("text")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            bodyType === "text" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          テキスト入力
        </button>
        <button
          type="button"
          onClick={() => setBodyType("pdf")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            bodyType === "pdf" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          PDFアップロード
        </button>
      </div>

      {/* hidden inputs */}
      <input type="hidden" name="bodyType" value={bodyType} />
      <input type="hidden" name="bodyPdfUrl" value={pdfUrl} />
      <input type="hidden" name="bodyOrientation" value={orientation} />
      <input type="hidden" name="readingDirection" value={readingDirection} />

      {/* 読む方向（縦書き戯曲は右→左に進む） */}
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={readingDirection === "rtl"}
          onChange={(e) =>
            setReadingDirection(e.target.checked ? "rtl" : "ltr")
          }
          className="h-4 w-4 rounded border-gray-300 text-pink-500 focus:ring-pink-400"
        />
        縦書き（右から左へ進む）
      </label>

      {/* テキスト入力 */}
      {bodyType === "text" && (
        <textarea
          name="body"
          defaultValue={initialBody}
          rows={20}
          placeholder="本文をここに入力してください"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-colors font-mono"
        />
      )}

      {/* PDF アップロード */}
      {bodyType === "pdf" && (
        <div>
          {pdfUrl ? (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50">
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{pdfFileName || "アップロード済みPDF"}</p>
                  <p className="text-xs text-gray-400">
                    PDF形式 · {orientation === "portrait" ? "縦向き" : "横向き"}（自動判定）
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPdfUrl(""); setPdfFileName(""); }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  削除
                </button>
              </div>
              <iframe src={pdfUrl} className="w-full h-96 rounded border border-gray-200" />
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 cursor-pointer hover:border-gray-400 transition-colors">
              <svg className="h-8 w-8 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm font-medium text-gray-600">
                {uploading ? "アップロード中..." : "PDFファイルを選択"}
              </p>
              <p className="text-xs text-gray-400 mt-1">最大20MB · 向きは自動判定されます</p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
