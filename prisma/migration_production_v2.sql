-- 戯曲パレット 本番DB マイグレーション (Schema分離版)
-- 2026-04-17
--
-- 全 PaletteXXX テーブルを `palette` schema に配置する。
-- User / Account / Session / VerificationToken は public schema (戯曲図書館共有)。
--
-- 実行:
--   psql "$DIRECT_URL" -f prisma/migration_production_v2.sql
--
-- 冪等(IF NOT EXISTS / DO ガード) なので複数回実行しても安全。
-- ただし「旧 public.palette_xxx → 新 palette.palette_xxx」のデータ移行は
-- 別途必要(ローカルはリセット前提、本番は新規作成のためデータ移行不要)。

-- ============================================
-- 0. schema を作成
-- ============================================
CREATE SCHEMA IF NOT EXISTS palette;

-- ============================================
-- 1. ジャンル
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_genres (
  id   serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE
);

-- ============================================
-- 2. シリーズ
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_series (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  author_id       text NOT NULL,
  title           text NOT NULL,
  description     text,
  cover_image_url text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_palette_series_author
  ON palette.palette_series(author_id, created_at DESC);

-- ============================================
-- 3. 作品本体
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_plays (
  id                 text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  author_id          text NOT NULL,
  title              text NOT NULL,
  synopsis           text NOT NULL,
  body               text,
  body_pdf_url       text,
  body_type          text NOT NULL DEFAULT 'text',
  body_orientation   text NOT NULL DEFAULT 'portrait',
  reading_direction  text NOT NULL DEFAULT 'ltr',
  series_id          text,
  series_order       integer,
  duration_minutes   integer NOT NULL,
  cast_total         integer NOT NULL,
  cast_male          integer NOT NULL DEFAULT 0,
  cast_female        integer NOT NULL DEFAULT 0,
  cast_other         integer NOT NULL DEFAULT 0,
  fee_amount         integer NOT NULL DEFAULT 0,
  is_free            boolean NOT NULL DEFAULT true,
  is_published       boolean NOT NULL DEFAULT false,
  cover_image_url    text,
  view_count         integer NOT NULL DEFAULT 0,
  download_count     integer NOT NULL DEFAULT 0,
  avg_rating         double precision NOT NULL DEFAULT 0,
  review_count       integer NOT NULL DEFAULT 0,
  published_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_palette_play_author
  ON palette.palette_plays(author_id);
CREATE INDEX IF NOT EXISTS idx_palette_play_published
  ON palette.palette_plays(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_palette_play_series
  ON palette.palette_plays(series_id, series_order);
CREATE INDEX IF NOT EXISTS idx_palette_play_ranking_views
  ON palette.palette_plays(is_published, view_count DESC);
CREATE INDEX IF NOT EXISTS idx_palette_play_ranking_rating
  ON palette.palette_plays(is_published, avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_palette_play_ranking_downloads
  ON palette.palette_plays(is_published, download_count DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_plays_series_id_fkey') THEN
    ALTER TABLE palette.palette_plays
      ADD CONSTRAINT palette_plays_series_id_fkey
      FOREIGN KEY (series_id) REFERENCES palette.palette_series(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 4. 作品 - ジャンル中間
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_play_genres (
  play_id  text NOT NULL,
  genre_id integer NOT NULL,
  PRIMARY KEY (play_id, genre_id)
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_play_genres_play_fk') THEN
    ALTER TABLE palette.palette_play_genres
      ADD CONSTRAINT palette_play_genres_play_fk
      FOREIGN KEY (play_id) REFERENCES palette.palette_plays(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_play_genres_genre_fk') THEN
    ALTER TABLE palette.palette_play_genres
      ADD CONSTRAINT palette_play_genres_genre_fk
      FOREIGN KEY (genre_id) REFERENCES palette.palette_genres(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 5. タグ + 作品-タグ中間
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_tags (
  id         serial PRIMARY KEY,
  slug       text NOT NULL UNIQUE,
  name       text NOT NULL,
  play_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_palette_tag_popular
  ON palette.palette_tags(play_count DESC);

CREATE TABLE IF NOT EXISTS palette.palette_play_tags (
  play_id text NOT NULL,
  tag_id  integer NOT NULL,
  PRIMARY KEY (play_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_palette_play_tag_tag
  ON palette.palette_play_tags(tag_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_play_tags_play_fk') THEN
    ALTER TABLE palette.palette_play_tags
      ADD CONSTRAINT palette_play_tags_play_fk
      FOREIGN KEY (play_id) REFERENCES palette.palette_plays(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_play_tags_tag_fk') THEN
    ALTER TABLE palette.palette_play_tags
      ADD CONSTRAINT palette_play_tags_tag_fk
      FOREIGN KEY (tag_id) REFERENCES palette.palette_tags(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 6. 上演許可
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_permissions (
  id                  text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  play_id             text NOT NULL,
  applicant_id        text NOT NULL,
  organization_name   text NOT NULL,
  representative_name text NOT NULL,
  performance_title   text NOT NULL,
  start_date          timestamptz NOT NULL,
  end_date            timestamptz NOT NULL,
  venue_name          text NOT NULL,
  venue_location      text NOT NULL,
  expected_audience   integer NOT NULL,
  ticket_type         text NOT NULL,
  num_performances    integer NOT NULL DEFAULT 1,
  status              text NOT NULL DEFAULT 'pending',
  rejection_reason    text,
  revision_reason     text,
  withdrawn_at        timestamptz,
  withdrawn_reason    text,
  fee_amount          integer NOT NULL,
  platform_fee        integer NOT NULL DEFAULT 0,
  permission_number   text UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  reviewed_at         timestamptz,
  paid_at             timestamptz,
  expires_at          timestamptz
);
CREATE INDEX IF NOT EXISTS idx_palette_permission_play
  ON palette.palette_permissions(play_id);
CREATE INDEX IF NOT EXISTS idx_palette_permission_applicant
  ON palette.palette_permissions(applicant_id);
CREATE INDEX IF NOT EXISTS idx_palette_permission_status
  ON palette.palette_permissions(status);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_permissions_play_fk') THEN
    ALTER TABLE palette.palette_permissions
      ADD CONSTRAINT palette_permissions_play_fk
      FOREIGN KEY (play_id) REFERENCES palette.palette_plays(id);
  END IF;
END $$;

-- ============================================
-- 7. スレッド (permission + inquiry 統合)
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_threads (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  permission_id text UNIQUE,
  kind          text NOT NULL DEFAULT 'permission',
  participant1  text NOT NULL,
  participant2  text NOT NULL,
  last_message  text,
  last_at       timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_palette_thread_last_at
  ON palette.palette_threads(last_at DESC);
CREATE INDEX IF NOT EXISTS idx_palette_thread_p1
  ON palette.palette_threads(participant1, last_at DESC);
CREATE INDEX IF NOT EXISTS idx_palette_thread_p2
  ON palette.palette_threads(participant2, last_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_threads_permission_fk') THEN
    ALTER TABLE palette.palette_threads
      ADD CONSTRAINT palette_threads_permission_fk
      FOREIGN KEY (permission_id) REFERENCES palette.palette_permissions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 同一参加者ペアの inquiry スレッドを1つに制限する partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS uniq_palette_thread_inquiry_pair
  ON palette.palette_threads(participant1, participant2)
  WHERE kind = 'inquiry';

-- ============================================
-- 8. メッセージ
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_messages (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  thread_id  text NOT NULL,
  sender_id  text,
  type       text NOT NULL DEFAULT 'text',
  content    text NOT NULL,
  metadata   jsonb,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_palette_message_thread
  ON palette.palette_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_palette_message_unread
  ON palette.palette_messages(sender_id, read_at);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_messages_thread_fk') THEN
    ALTER TABLE palette.palette_messages
      ADD CONSTRAINT palette_messages_thread_fk
      FOREIGN KEY (thread_id) REFERENCES palette.palette_threads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 9. 添付
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_attachments (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  message_id    text,
  permission_id text,
  uploader_id   text NOT NULL,
  file_name     text NOT NULL,
  file_size     integer NOT NULL,
  mime_type     text NOT NULL,
  s3_key        text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_palette_attachment_permission
  ON palette.palette_attachments(permission_id);
CREATE INDEX IF NOT EXISTS idx_palette_attachment_message
  ON palette.palette_attachments(message_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_attachments_message_fk') THEN
    ALTER TABLE palette.palette_attachments
      ADD CONSTRAINT palette_attachments_message_fk
      FOREIGN KEY (message_id) REFERENCES palette.palette_messages(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_attachments_permission_fk') THEN
    ALTER TABLE palette.palette_attachments
      ADD CONSTRAINT palette_attachments_permission_fk
      FOREIGN KEY (permission_id) REFERENCES palette.palette_permissions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 10. 決済
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_payments (
  id                          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  permission_id               text NOT NULL UNIQUE,
  stripe_checkout_session_id  text,
  stripe_payment_intent_id    text,
  amount                      integer NOT NULL,
  platform_fee                integer NOT NULL,
  author_amount               integer NOT NULL,
  currency                    text NOT NULL DEFAULT 'jpy',
  status                      text NOT NULL DEFAULT 'pending',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  completed_at                timestamptz
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_payments_permission_fk') THEN
    ALTER TABLE palette.palette_payments
      ADD CONSTRAINT palette_payments_permission_fk
      FOREIGN KEY (permission_id) REFERENCES palette.palette_permissions(id);
  END IF;
END $$;

-- ============================================
-- 11. Stripe 連携アカウント
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_stripe_accounts (
  id                   text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id              text NOT NULL UNIQUE,
  stripe_account_id    text NOT NULL,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 12. 通知
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_notifications (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       text NOT NULL,
  type          text NOT NULL,
  permission_id text,
  title         text NOT NULL,
  message       text NOT NULL,
  is_read       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_palette_notification_user
  ON palette.palette_notifications(user_id, is_read, created_at DESC);

-- ============================================
-- 13. レビュー
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_reviews (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  play_id    text NOT NULL,
  user_id    text NOT NULL,
  rating     integer NOT NULL,
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (play_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_palette_review_play
  ON palette.palette_reviews(play_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_palette_review_user
  ON palette.palette_reviews(user_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_reviews_play_fk') THEN
    ALTER TABLE palette.palette_reviews
      ADD CONSTRAINT palette_reviews_play_fk
      FOREIGN KEY (play_id) REFERENCES palette.palette_plays(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 14. フォロー
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_follows (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  follower_id text NOT NULL,
  followee_id text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followee_id)
);
CREATE INDEX IF NOT EXISTS idx_palette_follows_follower
  ON palette.palette_follows(follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_palette_follows_followee
  ON palette.palette_follows(followee_id, created_at DESC);

-- ============================================
-- 15. ブックマーク
-- ============================================
CREATE TABLE IF NOT EXISTS palette.palette_bookmarks (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    text NOT NULL,
  play_id    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, play_id)
);
CREATE INDEX IF NOT EXISTS idx_palette_bookmarks_user
  ON palette.palette_bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_palette_bookmarks_play
  ON palette.palette_bookmarks(play_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'palette_bookmarks_play_fk') THEN
    ALTER TABLE palette.palette_bookmarks
      ADD CONSTRAINT palette_bookmarks_play_fk
      FOREIGN KEY (play_id) REFERENCES palette.palette_plays(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 確認 (任意)
-- ============================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'palette' ORDER BY table_name;
