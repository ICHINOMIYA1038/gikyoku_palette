export type PermissionStatus =
  | "pending"
  | "approved"
  | "paid"
  | "permitted"
  | "rejected"
  | "expired"
  | "revision_requested"
  | "withdrawn";

export type NotificationType =
  | "new_application"
  | "approved"
  | "rejected"
  | "payment_completed"
  | "permission_expired"
  | "revision_requested"
  | "permission_withdrawn"
  | "new_message"
  | "new_play_published";

export type TicketType = "paid" | "free";

export const PERMISSION_STATUS_LABELS: Record<PermissionStatus, string> = {
  pending: "審査中",
  approved: "振込待ち",
  paid: "入金確認待ち",
  permitted: "許可済み",
  rejected: "却下",
  expired: "期限切れ",
  revision_requested: "要修正",
  withdrawn: "取り下げ",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  new_application: "新規申請",
  approved: "承認",
  rejected: "却下",
  payment_completed: "決済完了",
  permission_expired: "期限切れ",
  revision_requested: "修正依頼",
  permission_withdrawn: "取り下げ",
  new_message: "メッセージ",
  new_play_published: "新作公開",
};

export const PLATFORM_FEE_RATE = 0;

/**
 * スレッド内の system message の種別。metadata.kind に入る。
 * UI側（message-timeline）は kind ごとに icon/color/label を差し替える。
 */
export type SystemMessageKind =
  | "permission_submitted"
  | "permission_resubmitted"
  | "permission_approved"
  | "permission_rejected"
  | "revision_requested"
  | "payment_completed"
  | "permission_withdrawn";

/** 参加者のロール。permission から導出される。 */
export type ThreadRole = "author" | "applicant";
