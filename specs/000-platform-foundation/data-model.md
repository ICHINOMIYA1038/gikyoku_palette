# Data Model: Gikyoku Joen Platform

## Entity Relationship Diagram

```text
User 1───* Play
User 1───* PerformancePermission (as applicant)
User 1───0..1 StripeAccount
User 1───* Notification

Play 1───* PerformancePermission
Play *───* Genre (through PlayGenre)

PerformancePermission 1───0..1 Payment
```

## Entities

### User（ユーザー）

Supabase Auth の `auth.users` と連携。アプリ固有データを `public.users` に保持。

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, default: auth.uid() | Supabase Auth のUUIDと同一 |
| display_name | VARCHAR(50) | NOT NULL | 表示名（ペンネーム） |
| bio | TEXT | NULLABLE | 自己紹介文 |
| avatar_url | VARCHAR(500) | NULLABLE | プロフィール画像URL |
| created_at | TIMESTAMPTZ | NOT NULL, default: now() | 登録日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, default: now() | 更新日時 |

### Play（戯曲）

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, default: gen_random_uuid() | |
| author_id | UUID | FK → User.id, NOT NULL | 執筆者 |
| title | VARCHAR(200) | NOT NULL | タイトル |
| synopsis | TEXT | NOT NULL | あらすじ |
| body | TEXT | NULLABLE | 本文（プレーンテキスト） |
| duration_minutes | INTEGER | NOT NULL | 上演時間（分） |
| cast_total | INTEGER | NOT NULL | 出演人数（合計） |
| cast_male | INTEGER | NOT NULL, default: 0 | 男性キャスト数 |
| cast_female | INTEGER | NOT NULL, default: 0 | 女性キャスト数 |
| cast_other | INTEGER | NOT NULL, default: 0 | 性別不問キャスト数 |
| fee_amount | INTEGER | NOT NULL, default: 0 | 上演料（日本円、0=無料） |
| is_free | BOOLEAN | NOT NULL, default: true | 無料上演可能フラグ |
| is_published | BOOLEAN | NOT NULL, default: false | 公開状態 |
| view_count | INTEGER | NOT NULL, default: 0 | 閲覧数 |
| published_at | TIMESTAMPTZ | NULLABLE | 公開日時 |
| created_at | TIMESTAMPTZ | NOT NULL, default: now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, default: now() | 更新日時 |

**Indexes**:
- `idx_play_author` on (author_id)
- `idx_play_published` on (is_published, published_at DESC)
- `idx_play_search` GIN index on (title, synopsis) for full-text search

### Genre（ジャンル）

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | |
| name | VARCHAR(50) | NOT NULL, UNIQUE | ジャンル名 |
| slug | VARCHAR(50) | NOT NULL, UNIQUE | URL用スラッグ |

**初期データ**: コメディ、シリアス、ミュージカル、時代劇、ファンタジー、SF、ホラー、その他

### PlayGenre（戯曲×ジャンル中間テーブル）

| Field | Type | Constraints | Description |
|---|---|---|---|
| play_id | UUID | FK → Play.id, PK | |
| genre_id | INTEGER | FK → Genre.id, PK | |

### PerformancePermission（上演許可申請）

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, default: gen_random_uuid() | |
| play_id | UUID | FK → Play.id, NOT NULL | 対象戯曲 |
| applicant_id | UUID | FK → User.id, NOT NULL | 申請者 |
| organization_name | VARCHAR(200) | NOT NULL | 団体名 |
| representative_name | VARCHAR(100) | NOT NULL | 代表者名 |
| performance_title | VARCHAR(200) | NOT NULL | 公演名 |
| start_date | DATE | NOT NULL | 公演開始日 |
| end_date | DATE | NOT NULL | 公演終了日 |
| venue_name | VARCHAR(200) | NOT NULL | 会場名 |
| venue_location | VARCHAR(300) | NOT NULL | 会場所在地 |
| expected_audience | INTEGER | NOT NULL | 想定観客数 |
| ticket_type | VARCHAR(10) | NOT NULL, CHECK (IN ('paid','free')) | チケット料金区分 |
| num_performances | INTEGER | NOT NULL, default: 1 | 上演回数 |
| applicant_message | TEXT | NULLABLE | 申請者メッセージ |
| status | VARCHAR(20) | NOT NULL, default: 'pending' | ステータス |
| author_message | TEXT | NULLABLE | 執筆者メッセージ（承認/却下時） |
| rejection_reason | TEXT | NULLABLE | 却下理由 |
| fee_amount | INTEGER | NOT NULL | 上演料（申請時点の金額スナップショット） |
| platform_fee | INTEGER | NOT NULL, default: 0 | プラットフォーム手数料 |
| permission_number | VARCHAR(20) | NULLABLE, UNIQUE | 許可番号 |
| created_at | TIMESTAMPTZ | NOT NULL, default: now() | 申請日時 |
| reviewed_at | TIMESTAMPTZ | NULLABLE | 承認/却下日時 |
| paid_at | TIMESTAMPTZ | NULLABLE | 決済完了日時 |
| expires_at | TIMESTAMPTZ | NULLABLE | 決済期限（承認から30日） |

**Status values**: `pending`(申請中), `approved`(承認済み/決済待ち), `permitted`(許可済み), `rejected`(却下), `expired`(期限切れ)

**Indexes**:
- `idx_permission_play` on (play_id)
- `idx_permission_applicant` on (applicant_id)
- `idx_permission_status` on (status)
- `idx_permission_expires` on (expires_at) WHERE status = 'approved'

### Payment（決済）

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, default: gen_random_uuid() | |
| permission_id | UUID | FK → PerformancePermission.id, NOT NULL, UNIQUE | 対応する申請 |
| stripe_checkout_session_id | VARCHAR(200) | NULLABLE | Stripe Checkout Session ID |
| stripe_payment_intent_id | VARCHAR(200) | NULLABLE | Stripe Payment Intent ID |
| amount | INTEGER | NOT NULL | 支払い総額（日本円） |
| platform_fee | INTEGER | NOT NULL | プラットフォーム手数料 |
| author_amount | INTEGER | NOT NULL | 執筆者受取額 |
| currency | VARCHAR(3) | NOT NULL, default: 'jpy' | 通貨 |
| status | VARCHAR(20) | NOT NULL, default: 'pending' | 決済ステータス |
| created_at | TIMESTAMPTZ | NOT NULL, default: now() | |
| completed_at | TIMESTAMPTZ | NULLABLE | 決済完了日時 |

**Status values**: `pending`, `completed`, `failed`, `refunded`

### StripeAccount（Stripe連携）

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, default: gen_random_uuid() | |
| user_id | UUID | FK → User.id, NOT NULL, UNIQUE | |
| stripe_account_id | VARCHAR(100) | NOT NULL | Stripe Express アカウントID |
| onboarding_completed | BOOLEAN | NOT NULL, default: false | オンボーディング完了 |
| created_at | TIMESTAMPTZ | NOT NULL, default: now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default: now() | |

### Notification（通知）

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, default: gen_random_uuid() | |
| user_id | UUID | FK → User.id, NOT NULL | 受信者 |
| type | VARCHAR(30) | NOT NULL | 通知種別 |
| permission_id | UUID | FK → PerformancePermission.id, NULLABLE | 関連申請 |
| title | VARCHAR(200) | NOT NULL | 通知タイトル |
| message | TEXT | NOT NULL | 通知本文 |
| is_read | BOOLEAN | NOT NULL, default: false | 既読フラグ |
| created_at | TIMESTAMPTZ | NOT NULL, default: now() | |

**Type values**: `new_application`(新規申請), `approved`(承認), `rejected`(却下), `payment_completed`(決済完了), `permission_expired`(期限切れ)

**Indexes**:
- `idx_notification_user` on (user_id, is_read, created_at DESC)

## Row Level Security (RLS) Policies

| Table | Policy | Rule |
|---|---|---|
| User | 全員閲覧可 | SELECT: true |
| User | 本人のみ更新 | UPDATE: auth.uid() = id |
| Play | 公開作品は全員閲覧可 | SELECT: is_published = true OR author_id = auth.uid() |
| Play | 執筆者のみ更新 | UPDATE: author_id = auth.uid() |
| PerformancePermission | 関係者のみ閲覧 | SELECT: applicant_id = auth.uid() OR play.author_id = auth.uid() |
| PerformancePermission | 申請者のみ作成 | INSERT: applicant_id = auth.uid() |
| Payment | 関係者のみ閲覧 | SELECT: permission の申請者 or 執筆者 |
| StripeAccount | 本人のみ | ALL: user_id = auth.uid() |
| Notification | 本人のみ | ALL: user_id = auth.uid() |
