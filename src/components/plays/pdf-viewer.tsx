"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
} from "lucide-react";

type Props = {
  src: string;
  /** ファイル名としては未使用だが、呼び出し側で渡している既存 API を維持 */
  title?: string;
  /** 横向きPDFを示すフラグ。現状レイアウト分岐には使っていないが互換のため受け取る */
  orientation?: "portrait" | "landscape";
  /** 'rtl' = 縦書き戯曲（右→左で進む）。キー操作・クリックゾーン・矢印アイコンを反転 */
  readingDirection?: "ltr" | "rtl";
};

export function PdfViewer({
  src,
  readingDirection = "ltr",
}: Props) {
  const isRtl = readingDirection === "rtl";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // pdfjs-dist の `PDFDocumentProxy` を直接型注釈に使うと top-level import が必要で、
  // dynamic import の遅延ロードの旨味が薄れる。ここはランタイムでだけ使うため unknown 扱い。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // コントロールの自動非表示
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    showControlsTemporarily();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [currentPage, showControlsTemporarily]);

  // PDF読み込み
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const pdfDoc = await pdfjsLib.getDocument({
          url: src,
          isEvalSupported: false,
          cMapUrl: "/cmaps/",
          cMapPacked: true,
        }).promise;
        if (!cancelled) {
          setPdf(pdfDoc);
          setTotalPages(pdfDoc.numPages);
          setCurrentPage(1);
          setLoading(false);
        }
      } catch (e) {
        console.error("PDF load error:", e);
        if (!cancelled) { setError("PDFの読み込みに失敗しました"); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [src]);

  // ページ描画
  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;
    const page = await pdf.getPage(currentPage);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const unscaledVp = page.getViewport({ scale: 1 });

    // フィット計算
    let fitScale: number;
    if (fullscreen) {
      // 全画面: 画面全体にフィット（上下左右の余白を少し確保）
      const pad = 16;
      const scaleW = (containerWidth - pad * 2) / unscaledVp.width;
      const scaleH = (containerHeight - pad * 2) / unscaledVp.height;
      fitScale = Math.min(scaleW, scaleH) * scale;
    } else {
      // 通常: コンテナ幅にフィット（canvasがはみ出さないように）
      const availableWidth = containerWidth * 0.95; // 5%マージン
      fitScale = (availableWidth / unscaledVp.width) * scale;
    }
    const viewport = page.getViewport({ scale: fitScale });

    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    await page.render({ canvasContext: ctx, viewport }).promise;
  }, [pdf, currentPage, scale, fullscreen]);

  useEffect(() => { renderPage(); }, [renderPage]);
  useEffect(() => {
    const h = () => renderPage();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [renderPage]);

  const prevPage = useCallback(() => setCurrentPage((p) => Math.max(1, p - 1)), []);
  const nextPage = useCallback(() => setCurrentPage((p) => Math.min(totalPages, p + 1)), [totalPages]);
  const zoomIn = () => setScale((s) => Math.min(3, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));
  const resetZoom = () => setScale(1);

  // キーボード操作。縦書き(rtl)は左右矢印の意味を反転する
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const leftGoes = isRtl ? nextPage : prevPage;
      const rightGoes = isRtl ? prevPage : nextPage;
      if (e.key === "ArrowLeft") { leftGoes(); showControlsTemporarily(); }
      else if (e.key === "ArrowUp") { prevPage(); showControlsTemporarily(); }
      else if (e.key === "ArrowRight") { rightGoes(); showControlsTemporarily(); }
      else if (e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); nextPage(); showControlsTemporarily(); }
      else if (e.key === "Escape" && fullscreen) setFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullscreen, prevPage, nextPage, showControlsTemporarily, isRtl]);

  // 漫画ビューア風クリック。縦書き(rtl)は左=次 / 右=前
  const handleViewerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const ratio = x / width;
    const leftAction = isRtl ? nextPage : prevPage;
    const rightAction = isRtl ? prevPage : nextPage;

    if (ratio < 0.3) {
      leftAction();
    } else if (ratio > 0.7) {
      rightAction();
    } else {
      setShowControls((v) => !v);
      if (!showControls) showControlsTemporarily();
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">{error}</p>
        <a href={src} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-pink-600 hover:underline">PDFを直接開く</a>
      </div>
    );
  }

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;
  const dark = fullscreen;

  const viewer = (
    <div className={`relative select-none ${fullscreen ? "h-full" : ""}`}>
      {/* 上部ツールバー（フェードイン/アウト） */}
      <div className={`absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className={`flex items-center justify-between px-4 py-2 ${dark ? "bg-black/70 backdrop-blur-sm" : "bg-white/90 backdrop-blur-sm border-b border-gray-200 rounded-t-lg"}`}>
          <div className={`text-sm font-medium ${dark ? "text-white" : "text-gray-800"}`}>
            {currentPage}<span className={dark ? "text-gray-400" : "text-gray-400"}> / {totalPages}</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={(e) => { e.stopPropagation(); zoomOut(); }} className={`p-1.5 rounded-md ${dark ? "text-gray-300 hover:bg-white/20" : "text-gray-500 hover:bg-gray-100"}`}><ZoomOut className="h-4 w-4" /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); resetZoom(); }} className={`px-2 py-1 rounded-md text-xs ${dark ? "text-gray-300 hover:bg-white/20" : "text-gray-500 hover:bg-gray-100"}`}>{Math.round(scale * 100)}%</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); zoomIn(); }} className={`p-1.5 rounded-md ${dark ? "text-gray-300 hover:bg-white/20" : "text-gray-500 hover:bg-gray-100"}`}><ZoomIn className="h-4 w-4" /></button>
            <div className={`mx-1 h-4 w-px ${dark ? "bg-gray-600" : "bg-gray-300"}`} />
            <button type="button" onClick={(e) => { e.stopPropagation(); setFullscreen(!fullscreen); }} className={`p-1.5 rounded-md ${dark ? "text-gray-300 hover:bg-white/20" : "text-gray-500 hover:bg-gray-100"}`}>
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* メインビューア（クリックで左右ページ送り） */}
      <div
        ref={containerRef}
        onClick={handleViewerClick}
        className={`relative cursor-pointer overflow-auto flex items-center justify-center ${dark ? "bg-gray-950" : "bg-gray-100 border border-gray-200 rounded-lg"}`}
        style={{
          height: fullscreen ? "100vh" : undefined,
          minHeight: fullscreen ? undefined : "300px",
        }}
      >
        {loading ? (
          <div className="text-sm text-gray-400">読み込み中...</div>
        ) : (
          <canvas ref={canvasRef} className={dark ? "" : "shadow-lg"} />
        )}

        {/* 左右ホバーヒント（縦書きは左=次・右=前なのでアイコンと可視条件も反転） */}
        {!loading && totalPages > 1 && showControls && (
          <>
            {/* 左サイド: 横書き=前 / 縦書き=次 */}
            {(isRtl ? !isLast : !isFirst) && (
              <div className="absolute left-0 top-0 bottom-0 w-[30%] flex items-center justify-start pl-4 pointer-events-none">
                <div className={`rounded-full p-2 ${dark ? "bg-white/10" : "bg-black/5"}`}>
                  <ChevronLeft className={`h-6 w-6 ${dark ? "text-white/50" : "text-gray-400"}`} />
                </div>
              </div>
            )}
            {/* 右サイド: 横書き=次 / 縦書き=前 */}
            {(isRtl ? !isFirst : !isLast) && (
              <div className="absolute right-0 top-0 bottom-0 w-[30%] flex items-center justify-end pr-4 pointer-events-none">
                <div className={`rounded-full p-2 ${dark ? "bg-white/10" : "bg-black/5"}`}>
                  <ChevronRight className={`h-6 w-6 ${dark ? "text-white/50" : "text-gray-400"}`} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 下部ページバー（フェードイン/アウト） */}
      {totalPages > 1 && (
        <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className={`flex items-center justify-center gap-2 py-2.5 ${dark ? "bg-black/70 backdrop-blur-sm" : "bg-white/90 backdrop-blur-sm border-t border-gray-200 rounded-b-lg"}`}>
            {/* ページドット */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(i + 1); }}
                  className={`rounded-full transition-all ${
                    i + 1 === currentPage
                      ? `w-6 h-2 ${dark ? "bg-white" : "bg-gray-800"}`
                      : `w-2 h-2 ${dark ? "bg-white/30 hover:bg-white/60" : "bg-gray-300 hover:bg-gray-500"}`
                  }`}
                  aria-label={`${i + 1}ページ`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
        <div className="flex-1 min-h-0">{viewer}</div>
      </div>
    );
  }

  return viewer;
}
