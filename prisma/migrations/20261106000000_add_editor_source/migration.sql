-- 戯曲エディタから取り込んだ作品の、原稿 ID と版（台帳 docs/gikyoku-editor.md）
ALTER TABLE "palette"."palette_plays" ADD COLUMN "source_script_id" TEXT;
ALTER TABLE "palette"."palette_plays" ADD COLUMN "source_revision" INTEGER;
CREATE UNIQUE INDEX "palette_plays_source_script_id_key" ON "palette"."palette_plays"("source_script_id");
