/**
 * PDFの1ページ目を解析して、向きと読み進める方向を推定する。
 * 縦書きは文字アイテムの transform 行列で回転が入っている（t[0]≈0 & |t[1]|≫0）
 * ので、そのパターンが過半数ならば rtl と判定する。
 *
 * クライアントサイドで動かすため "use client" の component から呼び出すこと。
 */
export type PdfOrientation = "portrait" | "landscape";
export type PdfReadingDirection = "ltr" | "rtl";

export type PdfMeta = {
  orientation: PdfOrientation;
  readingDirection: PdfReadingDirection;
};

const DEFAULT_META: PdfMeta = { orientation: "portrait", readingDirection: "ltr" };

export async function detectPdfMeta(file: File): Promise<PdfMeta> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const orientation: PdfOrientation =
      viewport.width > viewport.height ? "landscape" : "portrait";

    let vertical = 0;
    let horizontal = 0;
    try {
      const content = await page.getTextContent();
      for (const it of content.items) {
        if (!("transform" in it)) continue;
        const t = (it as { transform: number[] }).transform;
        // horizontal: t[0] / t[3] が主、t[1]/t[2] はほぼ 0
        // vertical (90° 回転): t[1] or t[2] が主、t[0]/t[3] はほぼ 0
        const horizScale = Math.abs(t[0]);
        const vertSkew = Math.abs(t[1]) + Math.abs(t[2]);
        if (vertSkew > horizScale) vertical++;
        else horizontal++;
      }
    } catch {
      // textContent 取得失敗はスキャンPDFの可能性。判定不能として ltr
    }

    const readingDirection: PdfReadingDirection = vertical > horizontal ? "rtl" : "ltr";
    return { orientation, readingDirection };
  } catch {
    return DEFAULT_META;
  }
}
