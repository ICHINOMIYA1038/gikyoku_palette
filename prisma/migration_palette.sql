-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "palette_plays" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "body" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "cast_total" INTEGER NOT NULL,
    "cast_male" INTEGER NOT NULL DEFAULT 0,
    "cast_female" INTEGER NOT NULL DEFAULT 0,
    "cast_other" INTEGER NOT NULL DEFAULT 0,
    "fee_amount" INTEGER NOT NULL DEFAULT 0,
    "is_free" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palette_plays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palette_genres" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "palette_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palette_play_genres" (
    "play_id" TEXT NOT NULL,
    "genre_id" INTEGER NOT NULL,

    CONSTRAINT "palette_play_genres_pkey" PRIMARY KEY ("play_id","genre_id")
);

-- CreateTable
CREATE TABLE "palette_permissions" (
    "id" TEXT NOT NULL,
    "play_id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "organization_name" TEXT NOT NULL,
    "representative_name" TEXT NOT NULL,
    "performance_title" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "venue_name" TEXT NOT NULL,
    "venue_location" TEXT NOT NULL,
    "expected_audience" INTEGER NOT NULL,
    "ticket_type" TEXT NOT NULL,
    "num_performances" INTEGER NOT NULL DEFAULT 1,
    "applicant_message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "author_message" TEXT,
    "rejection_reason" TEXT,
    "fee_amount" INTEGER NOT NULL,
    "platform_fee" INTEGER NOT NULL DEFAULT 0,
    "permission_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "palette_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palette_payments" (
    "id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "stripe_checkout_session_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "amount" INTEGER NOT NULL,
    "platform_fee" INTEGER NOT NULL,
    "author_amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'jpy',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "palette_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palette_stripe_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stripe_account_id" TEXT NOT NULL,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palette_stripe_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palette_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "permission_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palette_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_palette_play_author" ON "palette_plays"("author_id");

-- CreateIndex
CREATE INDEX "idx_palette_play_published" ON "palette_plays"("is_published", "published_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "palette_genres_name_key" ON "palette_genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "palette_genres_slug_key" ON "palette_genres"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "palette_permissions_permission_number_key" ON "palette_permissions"("permission_number");

-- CreateIndex
CREATE INDEX "idx_palette_permission_play" ON "palette_permissions"("play_id");

-- CreateIndex
CREATE INDEX "idx_palette_permission_applicant" ON "palette_permissions"("applicant_id");

-- CreateIndex
CREATE INDEX "idx_palette_permission_status" ON "palette_permissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "palette_payments_permission_id_key" ON "palette_payments"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "palette_stripe_accounts_user_id_key" ON "palette_stripe_accounts"("user_id");

-- CreateIndex
CREATE INDEX "idx_palette_notification_user" ON "palette_notifications"("user_id", "is_read", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "palette_play_genres" ADD CONSTRAINT "palette_play_genres_play_id_fkey" FOREIGN KEY ("play_id") REFERENCES "palette_plays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_play_genres" ADD CONSTRAINT "palette_play_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "palette_genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_permissions" ADD CONSTRAINT "palette_permissions_play_id_fkey" FOREIGN KEY ("play_id") REFERENCES "palette_plays"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_payments" ADD CONSTRAINT "palette_payments_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "palette_permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

