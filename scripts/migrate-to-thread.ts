/**
 * 既存の palette_permissions をスレッド型に移行する。
 *
 * 各 permission につき:
 *   1. palette_threads を1件作成
 *   2. system message "permission_submitted" を permission.createdAt で挿入
 *   3. applicant_message があれば user message として created_at 直後に挿入
 *   4. status 遷移に応じた system message を reviewed_at / paid_at で挿入
 *   5. author_message があれば user message として reviewed_at 直後に挿入
 *   6. thread.last_at / last_message を最終メッセージに合わせて更新
 *
 * 実行後、applicant_message / author_message カラムは本スクリプト末尾で DROP する。
 * 本スクリプトは idempotent を意図せず、**初回移行の1回のみ** 実行する。
 * （完了後 applicant_message/author_message カラムが無くなるので2回目は失敗する）
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type LegacyPermission = {
  id: string;
  status: string;
  applicant_id: string;
  applicant_message: string | null;
  author_message: string | null;
  rejection_reason: string | null;
  created_at: Date;
  reviewed_at: Date | null;
  paid_at: Date | null;
  permission_number: string | null;
  fee_amount: number;
};

async function main() {
  const legacy = await prisma.$queryRaw<LegacyPermission[]>`
    SELECT id, status, applicant_id, applicant_message, author_message,
           rejection_reason, created_at, reviewed_at, paid_at,
           permission_number, fee_amount
    FROM palette_permissions
    ORDER BY created_at ASC
  `;

  console.log(`Found ${legacy.length} permissions to migrate`);

  for (const p of legacy) {
    console.log(`  → ${p.id} (${p.status})`);
    await migrateOne(p);
  }

  // カラムをDROP（applicant_message / author_message）
  await prisma.$executeRawUnsafe(
    `ALTER TABLE palette_permissions DROP COLUMN IF EXISTS applicant_message`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE palette_permissions DROP COLUMN IF EXISTS author_message`
  );
  console.log("Dropped applicant_message / author_message columns");
}

async function migrateOne(p: LegacyPermission) {
  const events: Array<{
    type: "text" | "system";
    senderId: string | null;
    content: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }> = [];

  // 1. 申請送信
  events.push({
    type: "system",
    senderId: null,
    content: "申請を送信しました",
    metadata: { kind: "permission_submitted" },
    createdAt: p.created_at,
  });

  // 2. 申請者メッセージ
  if (p.applicant_message?.trim()) {
    events.push({
      type: "text",
      senderId: p.applicant_id,
      content: p.applicant_message.trim(),
      metadata: null,
      createdAt: new Date(p.created_at.getTime() + 1),
    });
  }

  // 3. 審査結果（reviewed_at が入っているもの）
  if (p.reviewed_at) {
    if (p.status === "rejected") {
      events.push({
        type: "system",
        senderId: null,
        content: "申請が却下されました",
        metadata: {
          kind: "permission_rejected",
          reason: p.rejection_reason || null,
        },
        createdAt: p.reviewed_at,
      });
    } else {
      // approved / permitted
      events.push({
        type: "system",
        senderId: null,
        content:
          p.fee_amount === 0
            ? "上演が許可されました"
            : "申請が承認されました",
        metadata: {
          kind: "permission_approved",
          permissionNumber: p.fee_amount === 0 ? p.permission_number : null,
        },
        createdAt: p.reviewed_at,
      });
    }

    // 4. 作家メッセージ
    if (p.author_message?.trim()) {
      // 作家の User ID は permission.play.authorId → 別途取得
      const play = await prisma.palettePlay.findUnique({
        where: { id: (await getPlayIdOf(p.id))! },
        select: { authorId: true },
      });
      if (play) {
        events.push({
          type: "text",
          senderId: play.authorId,
          content: p.author_message.trim(),
          metadata: null,
          createdAt: new Date(p.reviewed_at.getTime() + 1),
        });
      }
    }
  }

  // 5. 決済完了
  if (p.paid_at) {
    events.push({
      type: "system",
      senderId: null,
      content: "上演料の決済が完了しました",
      metadata: {
        kind: "payment_completed",
        permissionNumber: p.permission_number,
        amount: p.fee_amount,
      },
      createdAt: p.paid_at,
    });
  }

  // thread + messages を1トランザクションで作成
  const lastEvent = events[events.length - 1];
  // 参加者を取得（permission スレッドは applicant + 作家）
  const playRow = await prisma.palettePlay.findUnique({
    where: { id: (await getPlayIdOf(p.id))! },
    select: { authorId: true },
  });
  const authorId = playRow?.authorId ?? p.applicant_id;
  const [pp1, pp2] =
    p.applicant_id < authorId
      ? [p.applicant_id, authorId]
      : [authorId, p.applicant_id];

  await prisma.$transaction(async (tx) => {
    const thread = await tx.paletteThread.create({
      data: {
        permissionId: p.id,
        kind: "permission",
        participant1: pp1,
        participant2: pp2,
        lastMessage: summarize(lastEvent.content),
        lastAt: lastEvent.createdAt,
        createdAt: p.created_at,
      },
    });

    for (const e of events) {
      await tx.paletteMessage.create({
        data: {
          threadId: thread.id,
          senderId: e.senderId,
          type: e.type,
          content: e.content,
          metadata: (e.metadata as unknown as Record<string, string>) || undefined,
          createdAt: e.createdAt,
        },
      });
    }
  });
}

async function getPlayIdOf(permissionId: string): Promise<string | null> {
  const perm = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    select: { playId: true },
  });
  return perm?.playId ?? null;
}

function summarize(s: string): string {
  return s.length > 100 ? s.slice(0, 100) : s;
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Migration complete");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
