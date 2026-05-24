-- 当事者間直接振込フローへの移行
-- 1. palette_permissions に振込フロー用カラム追加
-- 2. palette_payments / palette_stripe_accounts を破棄

ALTER TABLE palette.palette_permissions
  ADD COLUMN IF NOT EXISTS payout_bank_info TEXT,
  ADD COLUMN IF NOT EXISTS transfer_reported_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS transfer_confirmed_at TIMESTAMP(3);

DROP TABLE IF EXISTS palette.palette_payments CASCADE;
DROP TABLE IF EXISTS palette.palette_stripe_accounts CASCADE;
