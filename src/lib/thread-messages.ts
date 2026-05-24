/**
 * スレッドへのメッセージ追加ヘルパー。
 *
 * 各 Server Action のトランザクション内から呼ぶ前提で `Prisma.TransactionClient` を受け取る。
 * permissions / threads 系 action での重複定義を集約する。
 */
import type { Prisma } from "@prisma/client";
import type { SystemMessageKind } from "@/types";

/**
 * スレッドにシステムメッセージを追加し、thread.lastMessage/lastAt を更新する。
 */
export async function appendSystemMessage(
  tx: Prisma.TransactionClient,
  params: {
    threadId: string;
    kind: SystemMessageKind;
    content: string;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
  }
) {
  const createdAt = params.createdAt ?? new Date();
  await tx.paletteMessage.create({
    data: {
      threadId: params.threadId,
      senderId: null,
      type: "system",
      content: params.content,
      metadata: { kind: params.kind, ...(params.metadata ?? {}) },
      createdAt,
    },
  });
  await tx.paletteThread.update({
    where: { id: params.threadId },
    data: { lastMessage: params.content, lastAt: createdAt },
  });
}

/**
 * スレッドにユーザーメッセージを追加し、thread.lastMessage/lastAt を更新する。
 * 空文字は無視する。
 */
export async function appendUserMessage(
  tx: Prisma.TransactionClient,
  params: {
    threadId: string;
    senderId: string;
    content: string;
    createdAt?: Date;
  }
) {
  const createdAt = params.createdAt ?? new Date();
  const trimmed = params.content.trim();
  if (!trimmed) return;
  await tx.paletteMessage.create({
    data: {
      threadId: params.threadId,
      senderId: params.senderId,
      type: "text",
      content: trimmed,
      createdAt,
    },
  });
  await tx.paletteThread.update({
    where: { id: params.threadId },
    data: {
      lastMessage: trimmed.length > 100 ? trimmed.slice(0, 100) : trimmed,
      lastAt: createdAt,
    },
  });
}
