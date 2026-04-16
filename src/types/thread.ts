/**
 * スレッド関連のクライアント向けDTO型定義。
 */

import type { PermissionStatus, SystemMessageKind, ThreadRole } from "./index";

export type ThreadKind = "permission" | "inquiry";

export type ThreadUser = {
  id: string;
  name: string;
  image: string | null;
};

export type ThreadPlaySummary = {
  id: string;
  title: string;
  coverImageUrl: string | null;
};

/** スレッド一覧用の軽量DTO */
export type ThreadSummary = {
  id: string;
  kind: ThreadKind;
  /** permission スレッドのみ */
  permission: {
    id: string;
    status: PermissionStatus;
    feeAmount: number;
  } | null;
  /** permission スレッドのみ */
  play: ThreadPlaySummary | null;
  other: ThreadUser;
  /** permission スレッドの場合のみ意味あり */
  role: ThreadRole | null;
  lastMessage: string | null;
  lastAt: string;
  unread: number;
};

/** 添付ファイル */
export type AttachmentSummary = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploaderId: string;
  createdAt: string;
};

/** スレッド内メッセージ */
export type ThreadMessage = {
  id: string;
  type: "text" | "system";
  senderId: string | null;
  isMine: boolean;
  content: string;
  metadata: Record<string, unknown> | null;
  kind: SystemMessageKind | null;
  attachments: AttachmentSummary[];
  createdAt: string;
  readAt: string | null;
};

export type PermissionInThread = {
  id: string;
  status: PermissionStatus;
  organizationName: string;
  representativeName: string;
  performanceTitle: string;
  startDate: string;
  endDate: string;
  venueName: string;
  venueLocation: string;
  expectedAudience: number;
  ticketType: "free" | "paid";
  numPerformances: number;
  feeAmount: number;
  platformFee: number;
  permissionNumber: string | null;
  rejectionReason: string | null;
  revisionReason: string | null;
  withdrawnReason: string | null;
  paidAt: string | null;
  expiresAt: string | null;
};

/** スレッド詳細 */
export type ThreadDetail = {
  id: string;
  kind: ThreadKind;
  /** permission スレッドのみ */
  role: ThreadRole | null;
  other: ThreadUser;
  /** permission スレッドのみ */
  play: ThreadPlaySummary | null;
  /** permission スレッドのみ */
  permission: PermissionInThread | null;
  /** permission スレッドのみ。有料作品の決済導線判断に使用 */
  authorStripeReady: boolean | null;
  attachments: AttachmentSummary[];
  messages: ThreadMessage[];
};
