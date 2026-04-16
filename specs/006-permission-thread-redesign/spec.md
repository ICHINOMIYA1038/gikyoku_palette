# Feature Specification: 上演許可フローの「会話スレッド型」再設計

**Feature Branch**: `006-permission-thread-redesign`
**Created**: 2026-04-16
**Updated**: 2026-04-16
**Status**: Approved（Phase 1着手可）
**Supersedes**: `004-performance-permission` の主要フロー、および 005-author-dashboard 内のメッセージ関連
**Removes**: 直近で実装した汎用メッセージ機能（`palette_conversations` / `palette_messages` / `/api/messages` / `/messages` / `/dashboard` ナビ「メッセージ」）

---

## 確定した設計判断

| 論点 | 決定 |
|---|---|
| 1スレッドの単位 | **1申請 = 1スレッド**（`permissionId` UNIQUE, NOT NULL） |
| 申請前の事前相談機能 | **不要**。問い合わせも申請と同時に行う。直近実装した汎用メッセージは廃止 |
| 既存データ移行 | **新形式に変換**（互換コードは残さない、技術的負債を残さない方針） |
| 公演完了報告（旧User Story H） | **不要**。permitted で終了 |

---

## 背景と問題意識

現状フローの本質的な問題：作家と劇団の対話が想定されていない。

- 申請後は1回のメッセージ枠で交渉完結を強要
- 却下されたら詰み（再申請・差戻し不可）
- 作家の審査画面に情報が薄く、判断材料が足りない
- 直近で追加した汎用メッセージ機能は許可申請と完全分離 → 「この話なんの申請だっけ？」問題

→ **「申請＝書類処理」ではなく「申請＝1つの会話プロジェクト」**というメンタルモデルに転換する。

---

## コアコンセプト

### 1申請 = 1スレッド

- 申請が出された瞬間に、その申請に紐付くスレッドが1本立つ
- スレッドの中で進行するもの：
  - 作家↔劇団の自由な対話（テキスト＋ファイル添付）
  - 申請内容の構造化情報（会場・期間・規模等）
  - システムイベント（送信／承認／決済／許可証発行／変更／取り下げ）
  - すべてのアクション（承認・却下・修正依頼・決済・取り下げ）

### 状態遷移

```
（作品詳細→申請フォーム送信）
   ↓
pending ──────┬──→ rejected
              │
              ├──→ permitted (無料作品: 即許可)
              │
              ├──→ approved → (申請者決済) → permitted (有料作品)
              │                     ↓
              │                  expired (30日決済なし)
              │
              ├──→ revision_requested → (申請者修正) → pending (繰り返し可)
              │
              └──→ withdrawn (申請者取り下げ)
```

新しい状態：
- `revision_requested` — 作家が修正依頼を出した
- `withdrawn` — 申請者が取り下げた

旧 `inquiry` / `completed` は採用しない。

---

## User Stories

### User Story A — 申請を送信する (Priority: P1)

**Acceptance**:
1. 作品詳細ページで「上演許可を申請する」 → 申請フォーム
2. フォーム項目（必須）: 団体名 / 代表者名 / 公演名 / 公演期間 / 会場名 / 会場所在地 / 想定観客数 / 上演回数 / 申請メッセージ（任意）
3. **添付ファイル可（任意）**: 企画書PDF・チラシ画像等
4. 送信 → `Permission` 作成、`Thread` 自動作成（1:1）、status=`pending`
5. スレッド内に system message「申請を送信しました」表示
6. 作家に通知（メール＋アプリ内）
7. 送信後の遷移先 = スレッド画面（`/threads/{threadId}` または `/permissions/{permissionId}`）

### User Story B — 申請後の対話 (Priority: P1)

**Why**: 申請後の質疑・追加情報送付・条件交渉をスレッド上で行う。

**Acceptance**:
1. 双方がいつでもメッセージとファイルを送れる（status=`rejected`/`withdrawn` 後は不可）
2. メッセージ既読管理あり
3. ポーリング 5秒で更新（既存実装を踏襲）

### User Story C — 作家がスレッド内で審査する (Priority: P1)

**Acceptance**:
1. ダッシュボード `/dashboard/permissions` 一覧 → 申請をクリック → **スレッド画面に遷移**（旧の別画面遷移を廃止）
2. スレッド右ペイン（モバイルは下部展開）に **企画情報パネル**：
   - 団体・代表者・公演期間・会場・規模
   - 添付ファイル一覧（クリックで閲覧/DL）
   - 上演料・決済状況・許可証番号
3. アクションボタン群：
   - **承認する**（メッセージ任意）
   - **修正を依頼する**（理由必須、添付可、status→revision_requested）
   - **却下する**（理由必須、status→rejected）
4. 操作はすべて system message としてスレッドに残る

### User Story D — 修正依頼と再申請 (Priority: P2)

**Acceptance**:
1. 作家が「修正を依頼する」 → 理由付き system message、status=`revision_requested`
2. 申請者は申請内容を編集できる（pending時の編集と同じUI）
3. 「修正版を提出」 → status=`pending`、system message「修正版を提出しました」
4. 作家が再審査する。回数制限なし。

### User Story E — 決済（有料作品） (Priority: P1)

**Acceptance**:
1. 作家承認後 → スレッド企画情報パネルに「**上演料を支払う ¥X,XXX**」ボタン（申請者のみ表示）
2. クリック → Stripe Checkout（既存実装を流用）
3. 決済完了 → スレッドに system message「決済完了 / 許可証番号 GJ-XXXXXX-XXXX」
4. status=`permitted`
5. **作家のStripe Connect未完の場合**: 「上演料を支払う」ボタンの代わりに「執筆者の決済準備中です」と表示し、作家にも警告メールを飛ばす（現状はクリック後にエラーで詰む）

### User Story F — 許可証ダウンロード (Priority: P1)

**Acceptance**:
1. status=`permitted` 以降、企画情報パネル内に「許可証をダウンロード」ボタン
2. 本格PDF化（許可番号・印影風デザイン）— 細部は別仕様で詰める

### User Story G — キャンセル・取り下げ (Priority: P2)

**Acceptance**:
1. 申請者は status=`pending`/`approved`/`revision_requested` 中に「**申請を取り下げる**」可能
2. 取り下げ理由（任意）→ status=`withdrawn`、system message
3. 取り下げ後はスレッド読み取り専用

---

## データモデル

### 新規テーブル

#### `palette_threads`

```prisma
model PaletteThread {
  id           String   @id @default(cuid())
  permissionId String   @unique @map("permission_id")  // 必ず申請に紐付く
  lastMessage  String?  @map("last_message")
  lastAt       DateTime @default(now()) @map("last_at")
  createdAt    DateTime @default(now()) @map("created_at")

  messages   PaletteMessage[]
  permission PalettePermission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@map("palette_threads")
}
```

参加者（作家・申請者）はpermission側から導出する：
- 作家 = `permission.play.authorId`
- 申請者 = `permission.applicantId`

#### `palette_messages`（再設計）

```prisma
model PaletteMessage {
  id        String   @id @default(cuid())
  threadId  String   @map("thread_id")
  senderId  String?  @map("sender_id")        // null = system message
  type      String   @default("text")          // 'text' | 'system'
  content   String                              // text本文 or system短いタイトル
  metadata  Json?                               // system: { kind, ...詳細 }
  readAt    DateTime? @map("read_at")           // 受信者が見たタイミング
  createdAt DateTime  @default(now()) @map("created_at")

  thread      PaletteThread       @relation(fields: [threadId], references: [id], onDelete: Cascade)
  attachments PaletteAttachment[]

  @@index([threadId, createdAt])
  @@index([senderId, readAt])
  @@map("palette_messages")
}
```

旧 `palette_messages` の `conversationId` / `receiverId` を破棄して再構築。

#### `palette_attachments`

```prisma
model PaletteAttachment {
  id           String   @id @default(cuid())
  messageId    String?  @map("message_id")        // メッセージ添付
  permissionId String?  @map("permission_id")     // 申請内容添付（企画書等）
  uploaderId   String   @map("uploader_id")
  fileName     String   @map("file_name")
  fileSize     Int      @map("file_size")
  mimeType     String   @map("mime_type")
  s3Key        String   @map("s3_key")
  createdAt    DateTime @default(now()) @map("created_at")

  message    PaletteMessage?    @relation(fields: [messageId], references: [id], onDelete: Cascade)
  permission PalettePermission? @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@index([permissionId])
  @@index([messageId])
  @@map("palette_attachments")
}
```

`messageId` か `permissionId` のどちらかにのみ紐付く（DB制約はアプリ層で担保）。

### 既存テーブル変更

#### `palette_permissions`

```prisma
status            String    // 既存に加えて: 'revision_requested' | 'withdrawn' を許容
revisionReason    String?   // 最新の修正依頼理由（履歴は system message で追える）
withdrawnAt       DateTime?
withdrawnReason   String?
```

`applicantMessage` / `authorMessage` カラムは **削除**（マイグレーション時にsystem messageへ吸収後にdrop column）。

### 削除する旧テーブル・コード

- `palette_conversations` テーブル — drop
- `palette_messages` 旧スキーマ — drop & 新スキーマで作り直し
- `/api/messages/route.ts`, `/api/messages/[id]/route.ts` — 削除
- `src/app/(protected)/messages/page.tsx`, `src/app/(protected)/messages/[id]/...` — 削除（または `/threads` に renameしつつ書き直し）
- `src/middleware.ts` の `/messages` パス — `/threads` に置き換え
- `src/app/(protected)/dashboard/layout.tsx` のナビ「メッセージ」 — そのまま「メッセージ」名で `/threads` へリンク

→ **「メッセージ」というラベル自体は残す**（ユーザーから見ると「申請ごとのメッセージ一覧」）。URLは `/threads`、内部実装はスレッド型。

---

## ファイル添付の仕様

### サポート形式と上限

- **企画書系**: PDF, DOCX, PPTX (max 10MB/file)
- **画像**: PNG, JPG, WEBP (max 5MB/file)
- **動画**: MP4 のみ、max 50MB/file（参考動画用、長尺は外部リンク推奨）
- **その他**: TXT, MD (max 1MB/file)

### 上限の総量

- 1メッセージあたり: 5ファイルまで、合計30MB
- 1スレッドあたり: 50ファイルまで、合計500MB

### 配信

- アップロード: presigned PUT URL（`/api/upload/attachment` 新設、既存 `upload-cover`/`upload-pdf` と同パターン）
- 閲覧:
  - 画像: `<img>` 直接表示（presigned GET URL、有効期限15分）
  - PDF: 既存 `PdfViewer` 流用
  - その他: ダウンロードのみ
- アクセス制御: スレッド参加者（permission.play.authorId / permission.applicantId）のみ

### 削除

- アップロード後5分以内ならアップローダーが削除可（誤投稿対策）
- それ以降は削除不可

---

## API 設計

### 新規

| メソッド | パス | 役割 |
|---|---|---|
| GET  | `/api/threads` | 自分が関わるスレッド一覧 |
| GET  | `/api/threads/[id]` | スレッド詳細（permission情報＋メッセージ＋添付） |
| POST | `/api/threads/[id]/messages` | メッセージ送信（添付ID配列を含む） |
| POST | `/api/upload/attachment` | presigned PUT URL発行 |
| GET  | `/api/attachments/[id]` | 認可チェック後、presigned GETへredirect |
| DELETE | `/api/attachments/[id]` | 5分以内なら削除 |

### Server Actions（新規）

- `requestRevision(permissionId, reason, message?)`
- `resubmitPermission(permissionId, formData)` — 修正版を提出
- `withdrawPermission(permissionId, reason?)`

### Server Actions（既存に副作用追加）

- `createPermission` → スレッド作成 + system message注入
- `approvePermission` → system message注入
- `rejectPermission` → system message注入

### 削除

- `/api/messages/route.ts`
- `/api/messages/[id]/route.ts`

---

## UI/画面設計

### 1. 作品詳細 `/plays/[id]`

サイドバーアクション（変更なし）：
```
[台本をダウンロード]   (既存)
[上演許可を申請する]   (既存)
```

事前相談ボタンは追加しない。

### 2. スレッド一覧 `/threads`

- ナビ表示名は「メッセージ」のまま（ユーザー視点を維持）
- フィルタ: **すべて** / **要対応** / **進行中** / **完了**
- リスト項目:
  ```
  [作品カバー] 山田太郎 / 「夏の終わりに」  [pending]   [4月16日]
              ご検討ありがとうございま…              [●3]
  ```
- ステータスバッジ色:
  - pending: blue（作家側で「要対応」マーク付与）
  - approved: amber
  - permitted: green
  - rejected/expired/withdrawn: gray
  - revision_requested: orange（申請者側で「要対応」マーク付与）

### 3. スレッド画面 `/threads/[id]`

レイアウト（lg以上、2カラム）：

```
┌───────────────────────────────────────────────────┐
│ ← 山田太郎 ・「夏の終わりに」 ・ [pending]        │ (sticky header)
├──────────────────────────┬───────────────────────┤
│ [system] 申請を送信しました│ 企画情報              │
│                          │ ─────────────────     │
│ 「ご検討ありがとう…」     │ 団体: 劇団Palette       │
│ ┌──────────────────┐     │ 代表: 鈴木花子          │
│ │ 「人数を6人に減らせ │     │ 期間: 2026/7/18-20      │
│ │  る予定です」      │     │ 会場: 小劇場アトリエ春風  │
│ └──────────────────┘     │ 観客: 80人              │
│                          │ 上演料: ¥5,000          │
│ [system] 修正を依頼…      │                       │
│                          │ 添付ファイル          │
│ ...                      │ - 企画書.pdf [DL]       │
│                          │ - チラシ.png [プレビュー]│
│                          │                       │
│                          │ アクション             │
│                          │ [承認] [修正依頼] [却下]│
├──────────────────────────┴───────────────────────┤
│ [📎] [メッセージを入力...]              [送信]      │ (sticky bottom)
└───────────────────────────────────────────────────┘
```

モバイル: 企画情報パネルは「企画詳細を見る」ボトムシートで開く。

### 4. システムメッセージのレンダリング

中央寄せの細枠カード。`metadata.kind` で icon / color 分岐：

| kind | icon | color | 表示例 |
|---|---|---|---|
| permission_submitted | Send | blue | 申請を送信しました |
| permission_resubmitted | RefreshCw | blue | 修正版を提出しました |
| permission_approved | Check | green | 承認されました |
| permission_rejected | X | red | 却下されました（理由: …） |
| revision_requested | AlertCircle | orange | 修正を依頼しました（理由: …） |
| payment_completed | DollarSign | green | 決済完了 / 許可証番号 GJ-… |
| permission_withdrawn | Trash | gray | 取り下げられました |

### 5. 作家ダッシュボード `/dashboard/permissions`

- 一覧をクリック → 別ページ遷移ではなく **スレッド `/threads/[id]` へ直接ジャンプ**
- フィルタタブ：「要対応」（pending + revision_requested 自分宛のもの） / 「すべて」 / ステータス別
- 旧「審査する」インライン展開UI（`PermissionReview` コンポーネント）は削除

### 6. 申請者ダッシュボード `/permissions`

- 一覧をクリック → **スレッド `/threads/[id]` へ直接ジャンプ**
- 旧 `/permissions/[id]` 詳細ページは削除（スレッドに統合）
- 旧 `/permissions/[id]/pay` 決済ページも削除（スレッドのアクションボタンに統合）

---

## マイグレーション戦略

### スクリプト `scripts/migrate-to-thread.ts`

各既存 `palette_permissions` レコードに対して：

1. `palette_threads` を1件作成（`permissionId` で紐付け）
2. system message「申請を送信しました」を `createdAt = permission.createdAt` で挿入
3. `applicantMessage` がある場合、user message を `senderId = applicantId, createdAt = permission.createdAt + 1ms` で挿入
4. status遷移に応じた system message を挿入：
   - `reviewedAt` があれば「承認」「却下」「修正依頼」のいずれか
   - `paidAt` があれば「決済完了」
   - 各 createdAt は対応するタイムスタンプを使用
5. `authorMessage` がある場合、reviewedAt 直前または直後に user message を挿入
6. 既存 `palette_conversations` / 旧 `palette_messages` 全件 DELETE
7. `palette_permissions.applicantMessage` / `authorMessage` を NULL UPDATE → カラム DROP

実行は dev環境で動作確認後、本番へ。**本番未デプロイ**なので破壊的変更OK（ユーザー影響ゼロ）。

### 削除するコード

- `src/app/(protected)/messages/` 配下全削除
- `src/app/api/messages/` 配下全削除
- `src/components/dashboard/permission-review.tsx` 削除
- `src/app/(protected)/permissions/[id]/page.tsx` 削除
- `src/app/(protected)/permissions/[id]/pay/` 配下削除（決済UIをスレッドに移植後）

### 新規ディレクトリ構成

```
src/app/(protected)/threads/
  page.tsx                    # 一覧
  [id]/
    page.tsx                  # スレッド画面（Server Component, 認可と初期データ）
    thread-view.tsx           # Client Component, リアルタイム表示
    composer.tsx              # 入力エリア（テキスト＋添付）
    info-panel.tsx            # 企画情報パネル
    action-bar.tsx            # 承認/却下/修正依頼/決済等のアクション

src/app/api/
  threads/
    route.ts                  # GET一覧
    [id]/
      route.ts                # GET詳細
      messages/
        route.ts              # POST送信
  attachments/
    [id]/
      route.ts                # GET / DELETE
  upload/
    attachment/
      route.ts                # POST presigned URL発行

src/actions/
  threads.ts                  # server actions: send message, etc.
  permissions.ts              # 既存に副作用追加
                              # 新規: requestRevision, resubmitPermission, withdrawPermission
```

---

## 実装フェーズ

### Phase 1 — スキーマ刷新 + マイグレーション (見積: 半日)

1. Prisma schema に新テーブル追加 + permission拡張
2. 旧テーブル削除（raw SQL）
3. マイグレーションスクリプト作成・実行
4. Prisma client再生成
5. dev DBで既存データが新形式で見えること確認

### Phase 2 — スレッド基本機能 (見積: 1〜2日)

1. `/api/threads` GET, `/api/threads/[id]` GET
2. `/api/threads/[id]/messages` POST
3. `/threads` 一覧ページ
4. `/threads/[id]` スレッド画面（テキストのみ、添付は次Phase）
5. 既存 `createPermission` / `approvePermission` / `rejectPermission` に system message 注入
6. 旧 `/messages` 系コード・URLを完全削除（`middleware.ts` 含む）
7. 旧 `permissions/[id]` 詳細ページ削除 → 一覧から `/threads/[id]` へリダイレクト
8. 旧 `dashboard/permissions` のインライン審査UIをスレッド画面に移行

### Phase 3 — ファイル添付 (見積: 1〜2日)

1. `palette_attachments` schema, migration
2. `/api/upload/attachment` presigned URL発行
3. メッセージ送信UI に 📎 ボタン（複数添付、DnD）
4. 申請フォーム に添付UI
5. プレビュー（画像 / PDF）
6. 認可付き配信 `/api/attachments/[id]`

### Phase 4 — 修正依頼/再申請/取り下げ (見積: 1日)

1. `requestRevision` action + UI
2. `resubmitPermission` action + 申請編集UI（status=`revision_requested` 時）
3. `withdrawPermission` action + UI
4. status拡張（DB allow + types追加）

### Phase 5 — 決済UIをスレッドに統合 + Stripe未設定ガード (見積: 半日)

1. 決済ボタンを `action-bar.tsx` に組み込み
2. 旧 `/permissions/[id]/pay` 削除
3. 作家のStripe完了状態を有料作品の公開時にチェック
4. 申請フォームで「執筆者の決済準備状況」を明示
5. 承認時のサーバ側チェック追加

各Phaseは前Phaseに対するadditive変更で、各Phase終了時点でアプリは動く状態を保つ。

---

## 考慮事項・将来拡張

### Q1. 同じ劇団 × 同じ作品で再申請したい場合

→ 別スレッド（別permission）として独立。前回の文脈は引き継がない。
（劇団は前回スレッドを参照しながら新しい申請を出す形）

### Q2. 通知の頻度コントロール

メッセージ受信通知が大量に来る問題：

- 同じスレッド内で5分以上空けて未読がある時のみ集約通知
- アプリ内通知（既存 `paletteNotification`）は1メッセージ1件で記録、メールは集約

→ Phase 2で集約ロジック実装。

### Q3. ファイルのウイルススキャン

MVPはS3アップロード + MIME検査のみ。将来 AWS Macie 等を検討。

### Q4. メッセージの編集・削除

- 編集: 不可（許可申請の証跡として残す）
- 削除: 自分のメッセージ送信5分以内のみ、削除痕跡を残す（「メッセージは削除されました」表示）

### Q5. 作家側の定型文テンプレ

将来検討。Phase範囲外。

### Q6. ビデオ通話

スコープ外。Google Meet 等の外部リンク貼付で対応。

---

## 成功指標 (KPI)

- 申請成立率（pending → permitted）が現行比 **+30%**
- 申請から承認までのリードタイムが現行比 **-50%**
- 「修正依頼→再申請」発生率 **20%以上**

---

## 既存実装との衝突一覧（削除対象）

| パス | 種別 | 削除タイミング |
|---|---|---|
| `src/app/(protected)/messages/page.tsx` | コード | Phase 2 |
| `src/app/(protected)/messages/[id]/page.tsx` | コード | Phase 2 |
| `src/app/(protected)/messages/[id]/conversation-view.tsx` | コード | Phase 2 |
| `src/app/api/messages/route.ts` | コード | Phase 2 |
| `src/app/api/messages/[id]/route.ts` | コード | Phase 2 |
| `src/app/(protected)/permissions/[id]/page.tsx` | コード | Phase 2 |
| `src/app/(protected)/permissions/[id]/pay/page.tsx` | コード | Phase 5 |
| `src/app/(protected)/permissions/[id]/pay/payment-button.tsx` | コード | Phase 5 |
| `src/components/dashboard/permission-review.tsx` | コード | Phase 2 |
| `palette_conversations` table | DB | Phase 1 |
| 旧 `palette_messages` schema | DB | Phase 1 で再作成 |
| `palette_permissions.applicantMessage` カラム | DB | Phase 1 |
| `palette_permissions.authorMessage` カラム | DB | Phase 1 |
| `src/middleware.ts` の `/messages` パス | コード | Phase 2 で `/threads` に置換 |

---

End of spec
