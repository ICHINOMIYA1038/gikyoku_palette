/**
 * 各 PermissionStatus の状態に対応するテストデータを投入する冪等なシード。
 * 既に存在する permission(permissionNumber で識別) は削除してから再作成する。
 *
 * ステータス一覧:
 *   pending              - 申請済み・未審査
 *   approved             - 承認済み・未決済(有料のみ意味を持つ)
 *   permitted            - 許可済み(決済完了 or 無料即時)
 *   rejected             - 却下
 *   revision_requested   - 修正依頼中
 *   withdrawn            - 申請取下げ
 *   expired              - 期限切れ(approved のまま決済期限切れを想定)
 *
 * 実行:
 *   set -a && source .env.development.local && set +a
 *   npx tsx scripts/seed-permission-states.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// シード固有のマーカー。削除時に安全に識別できるよう prefix をつける
const MARK = "SEED-STATES-";

type Spec = {
  key: string;
  playEmail: string; // 作家
  applicantEmail: string;
  status:
    | "pending"
    | "approved"
    | "permitted"
    | "rejected"
    | "revision_requested"
    | "withdrawn"
    | "expired";
  organizationName: string;
  representativeName: string;
  performanceTitle: string;
  startDaysFromNow: number;
  endDaysFromNow: number;
  venueName: string;
  venueLocation: string;
  expectedAudience: number;
  ticketType: "free" | "paid";
  numPerformances: number;
  feeAmount: number;
  platformFee: number;
  rejectionReason?: string;
  revisionReason?: string;
  withdrawnReason?: string;
  permissionNumber?: string;
  reviewedDaysAgo?: number;
  paidDaysAgo?: number;
  expiresDaysFromNow?: number; // permitted/approved/expired の期限
};

// 作品は email_title で軽く検索する
async function findPlayByAuthorAndTitle(email: string, title: string) {
  const users = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "public"."User" WHERE email = ${email} LIMIT 1
  `;
  if (users.length === 0) throw new Error(`user not found: ${email}`);
  const play = await prisma.palettePlay.findFirst({
    where: { authorId: users[0].id, title },
  });
  if (!play) throw new Error(`play not found: ${email} / ${title}`);
  return { userId: users[0].id, play };
}

async function getUserId(email: string): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "public"."User" WHERE email = ${email} LIMIT 1
  `;
  if (rows.length === 0) throw new Error(`user not found: ${email}`);
  return rows[0].id;
}

// 指定した spec で 1 件の permission とスレッドを作る
async function seedOne(spec: Spec, playTitle: string) {
  const author = await findPlayByAuthorAndTitle(spec.playEmail, playTitle);
  const applicantId = await getUserId(spec.applicantEmail);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const startDate = new Date(now + spec.startDaysFromNow * day);
  const endDate = new Date(now + spec.endDaysFromNow * day);
  const createdAt = new Date(now - 5 * day); // 全件 5日前に申請した扱い
  const reviewedAt =
    spec.reviewedDaysAgo != null
      ? new Date(now - spec.reviewedDaysAgo * day)
      : null;
  const paidAt =
    spec.paidDaysAgo != null ? new Date(now - spec.paidDaysAgo * day) : null;
  const expiresAt =
    spec.expiresDaysFromNow != null
      ? new Date(now + spec.expiresDaysFromNow * day)
      : null;

  const permissionNumber = spec.permissionNumber ?? null;

  // 既存の同キー permission を消してから作り直す(冪等)
  await prisma.palettePermission.deleteMany({
    where: { performanceTitle: { startsWith: `${MARK}${spec.key} ` } },
  });

  const permission = await prisma.palettePermission.create({
    data: {
      playId: author.play.id,
      applicantId,
      organizationName: spec.organizationName,
      representativeName: spec.representativeName,
      performanceTitle: `${MARK}${spec.key} ${spec.performanceTitle}`,
      startDate,
      endDate,
      venueName: spec.venueName,
      venueLocation: spec.venueLocation,
      expectedAudience: spec.expectedAudience,
      ticketType: spec.ticketType,
      numPerformances: spec.numPerformances,
      status: spec.status,
      feeAmount: spec.feeAmount,
      platformFee: spec.platformFee,
      permissionNumber,
      rejectionReason: spec.rejectionReason ?? null,
      revisionReason: spec.revisionReason ?? null,
      withdrawnReason: spec.withdrawnReason ?? null,
      withdrawnAt: spec.status === "withdrawn" ? new Date(now - 2 * day) : null,
      createdAt,
      reviewedAt,
      paidAt,
      expiresAt,
    },
  });

  // スレッドと system メッセージを状態に合わせて投入
  const [p1, p2] = [applicantId, author.userId].sort();
  const thread = await prisma.paletteThread.create({
    data: {
      permissionId: permission.id,
      kind: "permission",
      participant1: p1,
      participant2: p2,
      lastAt: reviewedAt || createdAt,
      lastMessage: "",
      createdAt,
    },
  });

  type Msg = {
    type: "text" | "system";
    senderId: string | null;
    content: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
  };

  const messages: Msg[] = [];
  // 1. 申請送信(system)
  messages.push({
    type: "system",
    senderId: null,
    content: "上演許可申請が送信されました",
    metadata: { kind: "permission_submitted" },
    createdAt,
  });

  // 2. 申請者の自由メッセージ
  messages.push({
    type: "text",
    senderId: applicantId,
    content: `${author.play.title}、上演したく申請いたしました。ご検討よろしくお願いします。`,
    createdAt: new Date(createdAt.getTime() + 60_000),
  });

  // 3. 状態ごとの追加イベント
  if (spec.status === "approved" || spec.status === "permitted") {
    const at = reviewedAt || new Date(createdAt.getTime() + 2 * day);
    messages.push({
      type: "system",
      senderId: null,
      content: "上演許可が承認されました",
      metadata: {
        kind: "permission_approved",
        ...(permissionNumber ? { permissionNumber } : {}),
      },
      createdAt: at,
    });
  }

  if (spec.status === "permitted" && paidAt) {
    messages.push({
      type: "system",
      senderId: null,
      content: "上演料の決済が完了しました",
      metadata: {
        kind: "payment_completed",
        ...(permissionNumber ? { permissionNumber } : {}),
      },
      createdAt: paidAt,
    });
  }

  if (spec.status === "rejected") {
    const at = reviewedAt || new Date(createdAt.getTime() + 2 * day);
    messages.push({
      type: "system",
      senderId: null,
      content: "上演許可申請が却下されました",
      metadata: { kind: "permission_rejected", reason: spec.rejectionReason },
      createdAt: at,
    });
  }

  if (spec.status === "revision_requested") {
    const at = reviewedAt || new Date(createdAt.getTime() + 2 * day);
    messages.push({
      type: "system",
      senderId: null,
      content: "修正依頼が届きました",
      metadata: { kind: "revision_requested", reason: spec.revisionReason },
      createdAt: at,
    });
    messages.push({
      type: "text",
      senderId: author.userId,
      content: `申請内容の一部について、下記の点を修正いただけますでしょうか。${spec.revisionReason || ""}`,
      createdAt: new Date(at.getTime() + 60_000),
    });
  }

  if (spec.status === "withdrawn") {
    const at = new Date(now - 2 * day);
    messages.push({
      type: "system",
      senderId: null,
      content: "申請が取り下げられました",
      metadata: {
        kind: "permission_withdrawn",
        reason: spec.withdrawnReason,
      },
      createdAt: at,
    });
  }

  if (spec.status === "expired") {
    // expired は「承認はされたが決済期限を過ぎた」想定
    const approvedAt = reviewedAt || new Date(createdAt.getTime() + 2 * day);
    messages.push({
      type: "system",
      senderId: null,
      content: "上演許可が承認されました",
      metadata: {
        kind: "permission_approved",
        ...(permissionNumber ? { permissionNumber } : {}),
      },
      createdAt: approvedAt,
    });
  }

  // 最新メッセージの先頭を lastMessage に入れる
  const lastText = [...messages].reverse().find((m) => m.type === "text");
  const last = messages[messages.length - 1];
  await prisma.paletteThread.update({
    where: { id: thread.id },
    data: {
      lastMessage: lastText?.content.slice(0, 100) || last.content.slice(0, 100),
      lastAt: last.createdAt,
    },
  });

  await prisma.paletteMessage.createMany({
    data: messages.map((m) => ({
      threadId: thread.id,
      type: m.type,
      senderId: m.senderId,
      content: m.content,
      metadata: m.metadata ?? null,
      createdAt: m.createdAt,
    })),
  });

  console.log(
    `[OK] ${spec.status.padEnd(18)} key=${spec.key} play="${author.play.title}" applicant=${spec.applicantEmail}`
  );
}

async function main() {
  const specs: Array<{ spec: Spec; playTitle: string }> = [
    // 既存の pending を補強 → 鈴木花子 → 山田太郎「夏の終わりに」
    {
      spec: {
        key: "pending-1",
        playEmail: "taro@example.com",
        applicantEmail: "hanako@example.com",
        status: "pending",
        organizationName: "劇団シュクシュク",
        representativeName: "鈴木花子",
        performanceTitle: "劇団シュクシュク秋公演「夏の終わりに」",
        startDaysFromNow: 90,
        endDaysFromNow: 92,
        venueName: "下北沢小劇場",
        venueLocation: "東京都世田谷区北沢",
        expectedAudience: 80,
        ticketType: "paid",
        numPerformances: 4,
        feeAmount: 0, // 無料作品
        platformFee: 0,
      },
      playTitle: "夏の終わりに",
    },

    // approved: 鈴木花子 → 田中一郎「鬼の涙」(有料) : 決済待ち
    {
      spec: {
        key: "approved-1",
        playEmail: "ichiro@example.com",
        applicantEmail: "hanako@example.com",
        status: "approved",
        organizationName: "シアターカンパニー蓮",
        representativeName: "鈴木花子",
        performanceTitle: "シアターカンパニー蓮 第12回公演",
        startDaysFromNow: 60,
        endDaysFromNow: 62,
        venueName: "吉祥寺シアター",
        venueLocation: "東京都武蔵野市吉祥寺本町1-33-22",
        expectedAudience: 200,
        ticketType: "paid",
        numPerformances: 5,
        feeAmount: 5000,
        platformFee: 500,
        reviewedDaysAgo: 2,
        expiresDaysFromNow: 7, // 決済期限
      },
      playTitle: "鬼の涙",
    },

    // permitted: 山田太郎 → 田中一郎「星降る夜の物語」(有料・決済済)
    {
      spec: {
        key: "permitted-paid-1",
        playEmail: "ichiro@example.com",
        applicantEmail: "taro@example.com",
        status: "permitted",
        organizationName: "劇団青空",
        representativeName: "山田太郎",
        performanceTitle: "劇団青空 夏季公演",
        startDaysFromNow: 45,
        endDaysFromNow: 47,
        venueName: "中野小劇場",
        venueLocation: "東京都中野区中野4-5-1",
        expectedAudience: 120,
        ticketType: "paid",
        numPerformances: 3,
        feeAmount: 5000,
        platformFee: 500,
        reviewedDaysAgo: 4,
        paidDaysAgo: 3,
        permissionNumber: "GJ-20260412-SEED1",
      },
      playTitle: "星降る夜の物語",
    },

    // rejected: 田中一郎 → 山田太郎「深夜のカフェで」
    {
      spec: {
        key: "rejected-1",
        playEmail: "taro@example.com",
        applicantEmail: "ichiro@example.com",
        status: "rejected",
        organizationName: "テストカンパニー",
        representativeName: "田中一郎",
        performanceTitle: "テストカンパニー試演",
        startDaysFromNow: 30,
        endDaysFromNow: 31,
        venueName: "未定",
        venueLocation: "東京都内",
        expectedAudience: 30,
        ticketType: "free",
        numPerformances: 1,
        feeAmount: 0,
        platformFee: 0,
        reviewedDaysAgo: 1,
        rejectionReason:
          "同時期に別団体で上演予定があるため、今回はお見送りさせてください。別の時期であれば喜んで許可いたします。",
      },
      playTitle: "深夜のカフェで",
    },

    // revision_requested: 山田太郎 → 田中一郎「春を待つ人々」
    {
      spec: {
        key: "revision-1",
        playEmail: "ichiro@example.com",
        applicantEmail: "taro@example.com",
        status: "revision_requested",
        organizationName: "劇団 風待ち",
        representativeName: "山田太郎",
        performanceTitle: "劇団 風待ち 2026年春公演",
        startDaysFromNow: 120,
        endDaysFromNow: 123,
        venueName: "調整中",
        venueLocation: "東京都内",
        expectedAudience: 150,
        ticketType: "paid",
        numPerformances: 4,
        feeAmount: 10000,
        platformFee: 1000,
        reviewedDaysAgo: 1,
        revisionReason:
          "会場が未定のまま申請されていますので、確定次第再提出をお願いします。また、上演回数についても最終的な回数に更新してください。",
      },
      playTitle: "春を待つ人々",
    },

    // withdrawn: 鈴木花子 → 山田太郎「明日への手紙」(申請者が取り下げ)
    {
      spec: {
        key: "withdrawn-1",
        playEmail: "taro@example.com",
        applicantEmail: "hanako@example.com",
        status: "withdrawn",
        organizationName: "即興劇団エフェメラ",
        representativeName: "鈴木花子",
        performanceTitle: "即興劇団エフェメラ 試演",
        startDaysFromNow: 40,
        endDaysFromNow: 41,
        venueName: "都内スタジオ",
        venueLocation: "東京都渋谷区",
        expectedAudience: 40,
        ticketType: "free",
        numPerformances: 1,
        feeAmount: 0,
        platformFee: 0,
        withdrawnReason: "劇団の事情により、今回の公演を見送ることになりました。",
      },
      playTitle: "明日への手紙",
    },

    // expired: 田中一郎 → 山田太郎「東京バタフライ」 (承認されたが決済期限切れ)
    {
      spec: {
        key: "expired-1",
        playEmail: "taro@example.com",
        applicantEmail: "ichiro@example.com",
        status: "expired",
        organizationName: "劇団Expiredテスト",
        representativeName: "田中一郎",
        performanceTitle: "期限切れ検証用公演",
        startDaysFromNow: 80,
        endDaysFromNow: 81,
        venueName: "架空ホール",
        venueLocation: "東京都内",
        expectedAudience: 60,
        ticketType: "paid",
        numPerformances: 2,
        feeAmount: 3000,
        platformFee: 300,
        reviewedDaysAgo: 10,
        expiresDaysFromNow: -3, // 既に期限切れ
      },
      playTitle: "東京バタフライ",
    },
  ];

  for (const { spec, playTitle } of specs) {
    await seedOne(spec, playTitle);
  }

  console.log("\n完了: 各ステータスのテストデータが揃いました");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
