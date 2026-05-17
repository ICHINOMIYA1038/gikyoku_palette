"use client";

import { jsPDF } from "jspdf";
import type { PlayDocument } from "./play-document";
import { computeColumns, drawScript, getMaxPage, PAGE_W, PAGE_H } from "./draw-script";

// PAGE_W/PAGE_H は B5 横 (257mm × 182mm)
const PAGE_W_MM = 257;
const PAGE_H_MM = 182;

export async function exportPdf(doc: PlayDocument) {
  const cols = computeColumns(doc);
  const maxPage = getMaxPage(cols);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [PAGE_W_MM, PAGE_H_MM] });

  for (let page = 0; page <= maxPage; page++) {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    drawScript(ctx, doc, cols, null, page, null, null, "", undefined, true);
    const img = canvas.toDataURL("image/jpeg", 0.92);
    if (page > 0) pdf.addPage([PAGE_W_MM, PAGE_H_MM], "landscape");
    pdf.addImage(img, "JPEG", 0, 0, PAGE_W_MM, PAGE_H_MM);
  }

  const titleBlock = doc.blocks.find((b) => b.type === "title") as any;
  const filename = `${titleBlock?.title || "戯曲"}.pdf`;
  pdf.save(filename);
}
