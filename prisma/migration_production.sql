-- 戯曲パレット 本番DB マイグレーション
-- 実行: psql -U postgres -d <database> -f prisma/migration_production.sql

-- ジャンルテーブル
CREATE TABLE IF NOT EXISTS palette_genres (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- 作品テーブル
CREATE TABLE IF NOT EXISTS palette_plays (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  author_id TEXT NOT NULL,
  title TEXT NOT NULL,
  synopsis TEXT NOT NULL,
  body TEXT,
  duration_minutes INT NOT NULL,
  cast_total INT NOT NULL,
  cast_male INT NOT NULL DEFAULT 0,
  cast_female INT NOT NULL DEFAULT 0,
  cast_other INT NOT NULL DEFAULT 0,
  fee_amount INT NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  view_count INT NOT NULL DEFAULT 0,
  download_count INT NOT NULL DEFAULT 0,
  avg_rating DOUBLE PRECISION NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_palette_play_author ON palette_plays(author_id);
CREATE INDEX IF NOT EXISTS idx_palette_play_published ON palette_plays(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_palette_play_ranking_views ON palette_plays(is_published, view_count DESC);
CREATE INDEX IF NOT EXISTS idx_palette_play_ranking_rating ON palette_plays(is_published, avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_palette_play_ranking_downloads ON palette_plays(is_published, download_count DESC);

-- 作品×ジャンル中間テーブル
CREATE TABLE IF NOT EXISTS palette_play_genres (
  play_id TEXT NOT NULL REFERENCES palette_plays(id) ON DELETE CASCADE,
  genre_id INT NOT NULL REFERENCES palette_genres(id) ON DELETE CASCADE,
  PRIMARY KEY (play_id, genre_id)
);

-- 上演許可申請テーブル
CREATE TABLE IF NOT EXISTS palette_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  play_id TEXT NOT NULL REFERENCES palette_plays(id),
  applicant_id TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  representative_name TEXT NOT NULL,
  performance_title TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  venue_name TEXT NOT NULL,
  venue_location TEXT NOT NULL,
  expected_audience INT NOT NULL,
  ticket_type TEXT NOT NULL,
  num_performances INT NOT NULL DEFAULT 1,
  applicant_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  author_message TEXT,
  rejection_reason TEXT,
  fee_amount INT NOT NULL,
  platform_fee INT NOT NULL DEFAULT 0,
  permission_number TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_palette_permission_play ON palette_permissions(play_id);
CREATE INDEX IF NOT EXISTS idx_palette_permission_applicant ON palette_permissions(applicant_id);
CREATE INDEX IF NOT EXISTS idx_palette_permission_status ON palette_permissions(status);

-- 決済テーブル
CREATE TABLE IF NOT EXISTS palette_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  permission_id TEXT NOT NULL UNIQUE REFERENCES palette_permissions(id),
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount INT NOT NULL,
  platform_fee INT NOT NULL,
  author_amount INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'jpy',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Stripeアカウントテーブル
CREATE TABLE IF NOT EXISTS palette_stripe_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 通知テーブル
CREATE TABLE IF NOT EXISTS palette_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  permission_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_palette_notification_user ON palette_notifications(user_id, is_read, created_at DESC);

-- レビューテーブル
CREATE TABLE IF NOT EXISTS palette_reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  play_id TEXT NOT NULL REFERENCES palette_plays(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS palette_reviews_play_user_key ON palette_reviews(play_id, user_id);
CREATE INDEX IF NOT EXISTS idx_palette_review_play ON palette_reviews(play_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_palette_review_user ON palette_reviews(user_id);

-- ジャンル初期データ
INSERT INTO palette_genres (name, slug) VALUES
  ('コメディ', 'comedy'),
  ('シリアス', 'serious'),
  ('ミュージカル', 'musical'),
  ('時代劇', 'period'),
  ('ファンタジー', 'fantasy'),
  ('SF', 'sf'),
  ('ホラー', 'horror'),
  ('その他', 'other')
ON CONFLICT (slug) DO NOTHING;
