-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "palette";

-- CreateTable
CREATE TABLE "palette_plays" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "body" TEXT,
    "body_pdf_url" TEXT,
    "body_json" JSONB,
    "body_type" TEXT NOT NULL DEFAULT 'text',
    "body_orientation" TEXT NOT NULL DEFAULT 'portrait',
    "reading_direction" TEXT NOT NULL DEFAULT 'ltr',
    "series_id" TEXT,
    "series_order" INTEGER,
    "duration_minutes" INTEGER,
    "cast_total" INTEGER,
    "cast_male" INTEGER,
    "cast_female" INTEGER,
    "cast_other" INTEGER,
    "fee_amount" INTEGER NOT NULL DEFAULT 0,
    "is_free" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "cover_image_url" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "avg_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palette_plays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palette_tags" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "play_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palette_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palette_play_tags" (
    "play_id" TEXT NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "palette_play_tags_pkey" PRIMARY KEY ("play_id","tag_id")
);

-- CreateTable
CREATE TABLE "palette_series" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palette_series_pkey" PRIMARY KEY ("id")
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
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "revision_reason" TEXT,
    "withdrawn_at" TIMESTAMP(3),
    "withdrawn_reason" TEXT,
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
CREATE TABLE "palette_threads" (
    "id" TEXT NOT NULL,
    "permission_id" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'permission',
    "participant1" TEXT NOT NULL,
    "participant2" TEXT NOT NULL,
    "last_message" TEXT,
    "last_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palette_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palette_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palette_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palette_follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "followee_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palette_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palette_bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "play_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palette_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palette_attachments" (
    "id" TEXT NOT NULL,
    "message_id" TEXT,
    "permission_id" TEXT,
    "uploader_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palette_attachments_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "palette_reviews" (
    "id" TEXT NOT NULL,
    "play_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palette_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_palette_play_author" ON "palette_plays"("author_id");

-- CreateIndex
CREATE INDEX "idx_palette_play_published" ON "palette_plays"("is_published", "published_at" DESC);

-- CreateIndex
CREATE INDEX "idx_palette_play_series" ON "palette_plays"("series_id", "series_order");

-- CreateIndex
CREATE UNIQUE INDEX "palette_tags_slug_key" ON "palette_tags"("slug");

-- CreateIndex
CREATE INDEX "idx_palette_tag_popular" ON "palette_tags"("play_count" DESC);

-- CreateIndex
CREATE INDEX "idx_palette_play_tag_tag" ON "palette_play_tags"("tag_id");

-- CreateIndex
CREATE INDEX "idx_palette_series_author" ON "palette_series"("author_id", "created_at" DESC);

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
CREATE UNIQUE INDEX "palette_threads_permission_id_key" ON "palette_threads"("permission_id");

-- CreateIndex
CREATE INDEX "idx_palette_thread_last_at" ON "palette_threads"("last_at" DESC);

-- CreateIndex
CREATE INDEX "idx_palette_thread_p1" ON "palette_threads"("participant1", "last_at" DESC);

-- CreateIndex
CREATE INDEX "idx_palette_thread_p2" ON "palette_threads"("participant2", "last_at" DESC);

-- CreateIndex
CREATE INDEX "idx_palette_message_thread" ON "palette_messages"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_palette_message_unread" ON "palette_messages"("sender_id", "read_at");

-- CreateIndex
CREATE INDEX "idx_palette_follows_follower" ON "palette_follows"("follower_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_palette_follows_followee" ON "palette_follows"("followee_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "palette_follows_follower_id_followee_id_key" ON "palette_follows"("follower_id", "followee_id");

-- CreateIndex
CREATE INDEX "idx_palette_bookmarks_user" ON "palette_bookmarks"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_palette_bookmarks_play" ON "palette_bookmarks"("play_id");

-- CreateIndex
CREATE UNIQUE INDEX "palette_bookmarks_user_id_play_id_key" ON "palette_bookmarks"("user_id", "play_id");

-- CreateIndex
CREATE INDEX "idx_palette_attachment_permission" ON "palette_attachments"("permission_id");

-- CreateIndex
CREATE INDEX "idx_palette_attachment_message" ON "palette_attachments"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "palette_payments_permission_id_key" ON "palette_payments"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "palette_stripe_accounts_user_id_key" ON "palette_stripe_accounts"("user_id");

-- CreateIndex
CREATE INDEX "idx_palette_notification_user" ON "palette_notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_palette_review_play" ON "palette_reviews"("play_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_palette_review_user" ON "palette_reviews"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "palette_reviews_play_id_user_id_key" ON "palette_reviews"("play_id", "user_id");

-- AddForeignKey
ALTER TABLE "palette_plays" ADD CONSTRAINT "palette_plays_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "palette_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_play_tags" ADD CONSTRAINT "palette_play_tags_play_id_fkey" FOREIGN KEY ("play_id") REFERENCES "palette_plays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_play_tags" ADD CONSTRAINT "palette_play_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "palette_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_play_genres" ADD CONSTRAINT "palette_play_genres_play_id_fkey" FOREIGN KEY ("play_id") REFERENCES "palette_plays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_play_genres" ADD CONSTRAINT "palette_play_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "palette_genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_permissions" ADD CONSTRAINT "palette_permissions_play_id_fkey" FOREIGN KEY ("play_id") REFERENCES "palette_plays"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_threads" ADD CONSTRAINT "palette_threads_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "palette_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_messages" ADD CONSTRAINT "palette_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "palette_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_bookmarks" ADD CONSTRAINT "palette_bookmarks_play_id_fkey" FOREIGN KEY ("play_id") REFERENCES "palette_plays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_attachments" ADD CONSTRAINT "palette_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "palette_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_attachments" ADD CONSTRAINT "palette_attachments_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "palette_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_payments" ADD CONSTRAINT "palette_payments_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "palette_permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palette_reviews" ADD CONSTRAINT "palette_reviews_play_id_fkey" FOREIGN KEY ("play_id") REFERENCES "palette_plays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

