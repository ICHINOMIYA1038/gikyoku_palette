# Tasks: Gikyoku Joen Platform

**Input**: Design documents from `/specs/000-platform-foundation/`
**Prerequisites**: plan.md, data-model.md, research.md, specs 001-005

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: US1=認証, US2=一覧検索, US3=詳細, US4=上演許可, US5=ダッシュボード

---

## Phase 1: Setup (Project Initialization)

- [ ] T001 Initialize Next.js 15 project with TypeScript, Tailwind CSS, App Router (`npx create-next-app@latest`)
- [ ] T002 Install core dependencies: Prisma, Supabase client (`@supabase/supabase-js`, `@supabase/ssr`), Stripe (`stripe`, `@stripe/stripe-js`), shadcn/ui, Resend, `@react-pdf/renderer`
- [ ] T003 [P] Create `.env.local.example` with all required environment variables (Supabase URL/Key, Stripe keys, Resend API key)
- [ ] T004 [P] Create `.gitignore` with Next.js, Node.js, env patterns
- [ ] T005 [P] Configure `tsconfig.json` path aliases (`@/` → `src/`)
- [ ] T006 [P] Setup Vitest config in `vitest.config.ts`
- [ ] T007 [P] Setup Playwright config in `playwright.config.ts`
- [ ] T008 Create project directory structure per plan.md (`src/app/`, `src/components/`, `src/lib/`, `src/actions/`, `src/types/`, `prisma/`, `tests/`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Initialize Prisma with Supabase PostgreSQL connection in `prisma/schema.prisma`
- [ ] T010 Define all Prisma models: User, Play, Genre, PlayGenre, PerformancePermission, Payment, StripeAccount, Notification in `prisma/schema.prisma`
- [ ] T011 Run initial Prisma migration (`npx prisma migrate dev --name init`)
- [ ] T012 [P] Create seed script with Genre master data in `prisma/seed.ts`
- [ ] T013 [P] Setup Supabase client utilities in `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server)
- [ ] T014 [P] Setup Stripe client in `src/lib/stripe/client.ts`
- [ ] T015 Create auth middleware in `src/middleware.ts` for route protection (redirect unauthenticated users from `/dashboard/*`, `/permissions/*`, `/profile/*`)
- [ ] T016 [P] Setup shadcn/ui components (`npx shadcn@latest init`, add Button, Card, Input, Select, Badge, Dialog, DropdownMenu, Table, Tabs, Avatar, Skeleton)
- [ ] T017 Create shared layout in `src/app/layout.tsx` with font, metadata, Supabase provider
- [ ] T018 [P] Create Header component in `src/components/layout/header.tsx` (logo, navigation, login/logout button, avatar)
- [ ] T019 [P] Create Footer component in `src/components/layout/footer.tsx`
- [ ] T020 [P] Create TypeScript type definitions in `src/types/index.ts`
- [ ] T021 [P] Create utility functions in `src/lib/utils.ts` (date formatting, currency formatting, truncate text)

**Checkpoint**: Foundation ready — all user stories can now begin

---

## Phase 3: User Story 1 — ユーザー登録・ログイン (Priority: P1)

**Goal**: SNS認証によるユーザー登録・ログイン・プロフィール管理
**Independent Test**: Google/Xアカウントでログインし、プロフィール設定→ログアウト→再ログインが成功する

### Implementation

- [ ] T022 [US1] Configure Supabase Auth providers (Google, X/Twitter) in Supabase dashboard and document setup steps in `docs/supabase-auth-setup.md`
- [ ] T023 [US1] Create login page in `src/app/(auth)/login/page.tsx` with Google/X login buttons
- [ ] T024 [US1] Create auth callback handler in `src/app/(auth)/auth/callback/route.ts`
- [ ] T025 [US1] Create Supabase Database Trigger to auto-create `public.users` record on `auth.users` INSERT
- [ ] T026 [US1] Create profile edit page in `src/app/(protected)/profile/edit/page.tsx` (display name, bio, avatar upload)
- [ ] T027 [US1] Create profile update Server Action in `src/actions/auth.ts` (updateProfile)
- [ ] T028 [US1] Create auth state management: update Header to show avatar/logout when logged in, login button when not
- [ ] T029 [US1] Implement first-login detection and redirect to profile edit page
- [ ] T030 [US1] Create logout Server Action in `src/actions/auth.ts` (signOut)

**Checkpoint**: Users can sign up, log in, edit profile, and log out

---

## Phase 4: User Story 2 — 戯曲一覧・検索 (Priority: P1)

**Goal**: 公開中の戯曲をカード一覧で閲覧、キーワード検索、フィルタリング、並び替え
**Independent Test**: 一覧ページでカードが表示され、検索・フィルタで絞り込みできる

### Implementation

- [ ] T031 [US2] Create seed script for sample plays (5-10 works) in `prisma/seed.ts`
- [ ] T032 [US2] Create PlayCard component in `src/components/plays/play-card.tsx` (title, author, synopsis excerpt, duration, cast, genre badge)
- [ ] T033 [US2] Create search bar component in `src/components/plays/search-bar.tsx`
- [ ] T034 [US2] Create filter panel component in `src/components/plays/filter-panel.tsx` (duration, cast count, genre)
- [ ] T035 [US2] Create sort selector component in `src/components/plays/sort-selector.tsx` (newest, most viewed)
- [ ] T036 [US2] Create plays list Server Action in `src/actions/plays.ts` (getPlays with search, filter, sort, pagination)
- [ ] T037 [US2] Create top/listing page in `src/app/(public)/page.tsx` with PlayCard grid, search bar, filters, sort, pagination
- [ ] T038 [US2] Setup PostgreSQL full-text search with `pg_bigm` for Japanese text search (SQL migration)
- [ ] T039 [US2] Create pagination component in `src/components/ui/pagination.tsx`

**Checkpoint**: Visitors can browse, search, and filter plays

---

## Phase 5: User Story 3 — 戯曲詳細ページ (Priority: P1)

**Goal**: 個別作品の情報と本文表示、執筆者プロフィール、上演許可申請への導線
**Independent Test**: 一覧からカードクリックで詳細ページに遷移し、作品情報・本文・申請ボタンが表示される

### Implementation

- [ ] T040 [US3] Create play detail page in `src/app/(public)/plays/[id]/page.tsx` with metadata, body text, fee info, permission button
- [ ] T041 [US3] Create play metadata component in `src/components/plays/play-metadata.tsx` (duration, cast breakdown, genre, fee)
- [ ] T042 [US3] Create play body reader component in `src/components/plays/play-body.tsx` (plain text with proper formatting, line height, mobile responsive)
- [ ] T043 [US3] Create play detail Server Action in `src/actions/plays.ts` (getPlayById, incrementViewCount)
- [ ] T044 [US3] Create dynamic OGP metadata in `src/app/(public)/plays/[id]/page.tsx` using `generateMetadata()`
- [ ] T045 [US3] Create author profile page in `src/app/(public)/authors/[id]/page.tsx` (display name, bio, avatar, published plays list)
- [ ] T046 [US3] Create author profile Server Action in `src/actions/auth.ts` (getAuthorProfile with published plays)
- [ ] T047 [US3] Create "上演許可を申請する" CTA button component in `src/components/permissions/permission-cta.tsx` (redirect to login if unauthenticated)

**Checkpoint**: Visitors can read plays and navigate to author profiles

---

## Phase 6: User Story 4 — 上演許可申請 (Priority: P1)

**Goal**: 申請フォーム→執筆者承認→Stripe決済→許可証発行の完全フロー
**Independent Test**: 申請送信→執筆者が承認→Stripe テスト決済→許可証PDFダウンロードが成功する

### Implementation

- [ ] T048 [US4] Create permission application form page in `src/app/(protected)/permissions/new/[playId]/page.tsx` (organization, representative, performance dates, venue, audience, ticket type, num performances, message)
- [ ] T049 [US4] Create permission submit Server Action in `src/actions/permissions.ts` (createPermission: validate, save, notify author)
- [ ] T050 [US4] Create email notification templates with React Email in `src/lib/email/templates/` (new-application.tsx, status-change.tsx, payment-completed.tsx)
- [ ] T051 [US4] Create email sending utility in `src/lib/email/send.ts` using Resend
- [ ] T052 [US4] Create permission detail page in `src/app/(protected)/permissions/[id]/page.tsx` (show status, details, actions based on role)
- [ ] T053 [US4] Create approve/reject Server Actions in `src/actions/permissions.ts` (approvePermission, rejectPermission)
- [ ] T054 [US4] Create Stripe Connect onboarding flow: Server Action in `src/lib/stripe/actions.ts` (createExpressAccount, createAccountLink, handleOnboardingReturn)
- [ ] T055 [US4] Create Stripe onboarding page in `src/app/(protected)/dashboard/stripe/page.tsx`
- [ ] T056 [US4] Create Stripe Checkout Session for approved permissions: Server Action in `src/lib/stripe/actions.ts` (createCheckoutSession with application_fee_amount)
- [ ] T057 [US4] Create payment page in `src/app/(protected)/permissions/[id]/pay/page.tsx` (fee breakdown, Stripe Checkout redirect)
- [ ] T058 [US4] Create Stripe Webhook handler in `src/app/api/webhooks/stripe/route.ts` (checkout.session.completed → update permission status, create payment record, send notifications)
- [ ] T059 [US4] Create permission certificate PDF template in `src/lib/pdf/permission-certificate.tsx` (play title, author, applicant, dates, venue, permission number)
- [ ] T060 [US4] Create certificate download API route in `src/app/api/permissions/[id]/certificate/route.ts`
- [ ] T061 [US4] Create permission number generator utility in `src/lib/utils.ts` (format: GJ-YYYYMMDD-XXXX)
- [ ] T062 [US4] Create "マイ申請" page in `src/app/(protected)/permissions/page.tsx` (applicant's sent applications list with status)
- [ ] T063 [US4] Create Vercel Cron Job for expired permissions in `src/app/api/cron/expire-permissions/route.ts` and `vercel.json`

**Checkpoint**: Full permission flow works end-to-end with test Stripe payments

---

## Phase 7: User Story 5 — 執筆者ダッシュボード (Priority: P1)

**Goal**: 作品管理、申請管理、売上確認、通知をダッシュボードで一元管理
**Independent Test**: ダッシュボードにサマリーが表示され、作品の公開/非公開切り替え、申請の承認/却下ができる

### Implementation

- [ ] T064 [US5] Create dashboard layout in `src/app/(protected)/dashboard/layout.tsx` with sidebar navigation (概要, 作品管理, 申請管理, 売上, Stripe連携, 通知)
- [ ] T065 [US5] Create dashboard overview page in `src/app/(protected)/dashboard/page.tsx` with summary cards (published plays, total views, pending applications, monthly revenue)
- [ ] T066 [US5] Create dashboard summary Server Action in `src/actions/dashboard.ts` (getDashboardSummary)
- [ ] T067 [US5] Create plays management page in `src/app/(protected)/dashboard/plays/page.tsx` (list with status, views, applications count, edit/publish/unpublish actions)
- [ ] T068 [US5] Create play edit page in `src/app/(protected)/dashboard/plays/[id]/edit/page.tsx` (edit metadata: title, synopsis, duration, cast, genre, fee)
- [ ] T069 [US5] Create play update Server Actions in `src/actions/plays.ts` (updatePlay, togglePublish)
- [ ] T070 [US5] Create permissions management page in `src/app/(protected)/dashboard/permissions/page.tsx` (received applications list with status filter)
- [ ] T071 [US5] Create permission review component in `src/components/dashboard/permission-review.tsx` (application details, approve/reject buttons, message input)
- [ ] T072 [US5] Create sales page in `src/app/(protected)/dashboard/sales/page.tsx` (monthly summary, transaction history table)
- [ ] T073 [US5] Create sales Server Action in `src/actions/dashboard.ts` (getSalesSummary, getTransactionHistory)
- [ ] T074 [US5] Create notification list page in `src/app/(protected)/dashboard/notifications/page.tsx`
- [ ] T075 [US5] Create notification Server Actions in `src/actions/notifications.ts` (getNotifications, markAsRead)
- [ ] T076 [US5] Create notification badge in Header component (unread count from Supabase realtime or polling)
- [ ] T077 [US5] Create Notification model helpers: auto-create notifications on permission status changes in `src/actions/permissions.ts`

**Checkpoint**: Dashboard fully functional with all management features

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T078 [P] Create loading skeletons for all pages using Suspense boundaries and shadcn/ui Skeleton
- [ ] T079 [P] Create error boundaries and error pages (`src/app/not-found.tsx`, `src/app/error.tsx`)
- [ ] T080 [P] Create 404 page for non-existent plays and authors
- [ ] T081 [P] Add responsive design polish: test and fix all pages on mobile breakpoints
- [ ] T082 [P] Add SEO: sitemap.xml (`src/app/sitemap.ts`), robots.txt (`src/app/robots.ts`)
- [ ] T083 [P] Configure Supabase RLS policies per data-model.md
- [ ] T084 [P] Security audit: validate all Server Actions check auth, validate inputs with Zod
- [ ] T085 [P] Create Zod validation schemas in `src/lib/validations/` for all form inputs
- [ ] T086 [P] Write unit tests for critical business logic (permission status transitions, fee calculations, permission number generation) in `tests/unit/`
- [ ] T087 [P] Write E2E test for auth flow (login → profile setup → logout) in `tests/e2e/auth.spec.ts`
- [ ] T088 [P] Write E2E test for permission flow (browse → apply → approve → pay) in `tests/e2e/permission.spec.ts`
- [ ] T089 Setup Vercel deployment configuration and environment variables
- [ ] T090 Create seed script for demo data (sample users, plays, permissions) in `prisma/seed.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1
- **Phase 3 (認証)**: Depends on Phase 2 — MUST be first user story (all others depend on auth)
- **Phase 4 (一覧検索)**: Depends on Phase 2 + seed data
- **Phase 5 (詳細)**: Depends on Phase 4 (needs play data and listing to navigate from)
- **Phase 6 (上演許可)**: Depends on Phase 3 (auth) + Phase 5 (play detail for CTA)
- **Phase 7 (ダッシュボード)**: Depends on Phase 3 (auth) + Phase 6 (permission management)
- **Phase 8 (Polish)**: Depends on all user stories

### Parallel Opportunities

- Phase 4 (一覧) and Phase 3 (認証) can run in parallel after Phase 2
- Within each phase, tasks marked [P] can run in parallel
- T078-T090 (polish) are all independent

### Recommended Execution Order

```
Phase 1 → Phase 2 → Phase 3 (認証) + Phase 4 (一覧) in parallel
                   → Phase 5 (詳細) → Phase 6 (上演許可) → Phase 7 (ダッシュボード)
                   → Phase 8 (Polish)
```

---

## Summary

| Phase | Tasks | Parallel | Description |
|---|---|---|---|
| 1. Setup | T001-T008 | 5 | プロジェクト初期化 |
| 2. Foundational | T009-T021 | 8 | DB, Auth, UI基盤 |
| 3. 認証 | T022-T030 | 0 | ログイン・プロフィール |
| 4. 一覧検索 | T031-T039 | 0 | 戯曲一覧・検索 |
| 5. 詳細 | T040-T047 | 0 | 戯曲詳細・執筆者ページ |
| 6. 上演許可 | T048-T063 | 0 | 申請・決済・許可証 |
| 7. ダッシュボード | T064-T077 | 0 | 管理画面 |
| 8. Polish | T078-T090 | 10 | 品質・セキュリティ・テスト |
| **Total** | **90 tasks** | | |

**MVP scope**: Phase 1-7 (T001-T077) = 77 tasks
