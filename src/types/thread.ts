/**
 * スレッド関連のクライアント向けDTO型定義。
 * サーバからクライアントに渡すJSON shape をここに集約する。
 */

import type { PermissionStatus, SystemMessageKind, ThreadRole } from "./index";

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
  permission: {
    id: string;
    status: PermissionStatus;
    feeAmount: number;
  };
  play: ThreadPlaySummary;
  other: ThreadUser;
  role: ThreadRole;
  lastMessage: string | null;
  lastAt: string;
  unread: number;
};

/** 添付ファイル（メッセージ or 申請に紐付く） */
export type AttachmentSummary = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploaderId: string;
  createdAt: string;
};

/** スレッド内メッセージ（system / text どちらも） */
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

/** スレッド詳細 — ヘッダー・サイドパネル・タイムラインの描画に必要な全情報 */
export type ThreadDetail = {
  id: string;
  role: ThreadRole;
  other: ThreadUser;
  play: ThreadPlaySummary;
  permission: {
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
  /** 作家側の Stripe Connect 連携状態。有料作品の決済導線判断に使用 */
  authorStripeReady: boolean;
  attachments: AttachmentSummary[];
  messages: ThreadMessage[];
};
