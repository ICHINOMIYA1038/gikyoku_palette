export type PermissionStatus =
  | "pending"
  | "approved"
  | "permitted"
  | "rejected"
  | "expired";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type NotificationType =
  | "new_application"
  | "approved"
  | "rejected"
  | "payment_completed"
  | "permission_expired";

export type TicketType = "paid" | "free";

export const PERMISSION_STATUS_LABELS: Record<PermissionStatus, string> = {
  pending: "申請中",
  approved: "承認済み（決済待ち）",
  permitted: "許可済み",
  rejected: "却下",
  expired: "期限切れ",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  new_application: "新規申請",
  approved: "承認",
  rejected: "却下",
  payment_completed: "決済完了",
  permission_expired: "期限切れ",
};

export const PLATFORM_FEE_RATE = 0.05;
