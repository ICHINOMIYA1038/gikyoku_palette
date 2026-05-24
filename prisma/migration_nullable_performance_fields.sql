-- 上演時間・出演人数を「未定」にできるよう NULL 許容に変更
ALTER TABLE palette.palette_plays ALTER COLUMN "duration_minutes" DROP NOT NULL;
ALTER TABLE palette.palette_plays ALTER COLUMN "cast_total" DROP NOT NULL;
ALTER TABLE palette.palette_plays ALTER COLUMN "cast_male" DROP NOT NULL;
ALTER TABLE palette.palette_plays ALTER COLUMN "cast_male" DROP DEFAULT;
ALTER TABLE palette.palette_plays ALTER COLUMN "cast_female" DROP NOT NULL;
ALTER TABLE palette.palette_plays ALTER COLUMN "cast_female" DROP DEFAULT;
ALTER TABLE palette.palette_plays ALTER COLUMN "cast_other" DROP NOT NULL;
ALTER TABLE palette.palette_plays ALTER COLUMN "cast_other" DROP DEFAULT;
