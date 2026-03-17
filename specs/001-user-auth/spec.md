# Feature Specification: ユーザー登録・ログイン

**Feature Branch**: `001-user-auth`
**Created**: 2026-03-17
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - SNSアカウントで新規登録 (Priority: P1)

新規ユーザーがGoogleまたはXのアカウントを使って、ワンクリックでサイトに登録できる。登録後、すぐに戯曲の閲覧や上演許可申請が可能になる。

**Why this priority**: 全機能の前提となる認証基盤。ユーザーがサイトを使い始めるための最初のステップ。

**Independent Test**: SNSアカウントでログインし、プロフィールページが表示されることを確認。

**Acceptance Scenarios**:

1. **Given** 未登録のユーザー, **When** Googleアカウントでログインボタンを押す, **Then** Googleの認証画面にリダイレクトされ、認証後にサイトに戻りプロフィール設定画面が表示される
2. **Given** 未登録のユーザー, **When** X（Twitter）アカウントでログインボタンを押す, **Then** Xの認証画面にリダイレクトされ、認証後にサイトに戻りプロフィール設定画面が表示される
3. **Given** 認証完了後の初回ユーザー, **When** プロフィール設定画面が表示される, **Then** 表示名（ペンネーム）と自己紹介を入力できる

---

### User Story 2 - 既存ユーザーのログイン (Priority: P1)

既に登録済みのユーザーが、以前使用したSNSアカウントで素早くログインできる。

**Why this priority**: 日常的な利用に不可欠。

**Independent Test**: 登録済みアカウントでログインし、前回のプロフィール情報が保持されていることを確認。

**Acceptance Scenarios**:

1. **Given** 登録済みのユーザー, **When** GoogleまたはXでログインする, **Then** トップページにリダイレクトされ、ログイン状態になる
2. **Given** ログイン済みのユーザー, **When** ページをリロードする, **Then** ログイン状態が維持される

---

### User Story 3 - プロフィール編集 (Priority: P2)

ユーザーが自分のプロフィール情報（表示名、自己紹介、プロフィール画像）を編集できる。

**Why this priority**: 執筆者としてのアイデンティティ確立に必要だが、ログイン後に設定できればよい。

**Independent Test**: プロフィール編集画面で情報を変更し、保存後に反映されることを確認。

**Acceptance Scenarios**:

1. **Given** ログイン済みのユーザー, **When** プロフィール編集ページで表示名を変更して保存する, **Then** 変更が反映される
2. **Given** ログイン済みのユーザー, **When** 自己紹介文を入力して保存する, **Then** プロフィールページに自己紹介が表示される

---

### User Story 4 - ログアウト (Priority: P2)

ユーザーがログアウトしてセッションを終了できる。

**Why this priority**: セキュリティ上必要だが、基本的な機能。

**Independent Test**: ログアウト後に認証が必要なページにアクセスできないことを確認。

**Acceptance Scenarios**:

1. **Given** ログイン済みのユーザー, **When** ログアウトボタンを押す, **Then** セッションが終了しトップページにリダイレクトされる
2. **Given** ログアウト済みのユーザー, **When** ダッシュボードにアクセスしようとする, **Then** ログイン画面にリダイレクトされる

---

### Edge Cases

- SNS側でアカウントが凍結・削除された場合はどうなるか？ → ログイン不可となり、エラーメッセージを表示
- 同一メールアドレスでGoogleとXの両方からログインした場合 → Supabase Authのアカウントリンク機能で同一ユーザーとして扱う
- ネットワークエラーで認証フローが中断した場合 → エラーメッセージを表示し再試行を促す

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support Google OAuth 2.0 による認証
- **FR-002**: System MUST support X (Twitter) OAuth 2.0 による認証
- **FR-003**: System MUST 初回ログイン時にユーザーレコードを自動作成する
- **FR-004**: System MUST ユーザーに表示名（ペンネーム）の設定を求める（初回ログイン時）
- **FR-005**: System MUST ログイン状態をセッションで維持する
- **FR-006**: System MUST ログアウト機能を提供する
- **FR-007**: System MUST プロフィール編集機能を提供する（表示名、自己紹介、プロフィール画像）
- **FR-008**: System MUST 未認証ユーザーからの保護対象ページへのアクセスをブロックし、ログイン画面にリダイレクトする
- **FR-009**: System MUST 同一メールアドレスの異なるSNSアカウントを同一ユーザーとしてリンクする

### Key Entities

- **User**: ユーザー情報。表示名（ペンネーム）、自己紹介、プロフィール画像URL、登録日時、最終ログイン日時
- **AuthAccount**: SNS連携情報。プロバイダー種別（Google/X）、プロバイダーユーザーID、メールアドレス。Supabase Authが管理。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ユーザーが3クリック以内にログイン完了できる
- **SC-002**: 初回登録からプロフィール設定完了まで2分以内で完了できる
- **SC-003**: ログイン成功率が99%以上（SNSプロバイダー側の障害を除く）
- **SC-004**: ページリロード後もログイン状態が維持される
