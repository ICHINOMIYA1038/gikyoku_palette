import { Calendar, MapPin, Users, Banknote, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThreadDetail } from "@/types/thread";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentButton } from "./payment-button";

/**
 * スレッド右ペインの企画情報パネル。
 * - 申請内容の構造化情報を集約表示
 * - permittedなら許可証DL、approvedなら決済ボタン（申請者のみ）
 * - 添付ファイル一覧（Phase 3で充実）
 */
export function InfoPanel({ detail }: { detail: ThreadDetail }) {
  const { permission, role } = detail;
  const isApplicant = role === "applicant";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-400">
        企画情報
      </h2>

      {/* 団体 */}
      <Section label="団体">
        <p className="font-medium text-gray-900">{permission.organizationName}</p>
        <p className="text-xs text-gray-500">代表: {permission.representativeName}</p>
      </Section>

      {/* 公演 */}
      <Section label="公演">
        <p className="font-medium text-gray-900">{permission.performanceTitle}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          {formatDate(permission.startDate)} 〜 {formatDate(permission.endDate)}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="h-3 w-3" />
          {permission.venueName} ({permission.venueLocation})
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
          <Users className="h-3 w-3" />
          想定観客: {permission.expectedAudience.toLocaleString()}人 / 上演{" "}
          {permission.numPerformances}回
        </p>
      </Section>

      {/* 上演料 */}
      <Section label="上演料">
        <p className="flex items-center gap-1 font-medium text-gray-900">
          <Banknote className="h-3 w-3 text-gray-400" />
          {permission.feeAmount === 0
            ? "無料"
            : formatCurrency(permission.feeAmount)}
        </p>
        {permission.feeAmount > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            手数料(5%): {formatCurrency(permission.platformFee)}<br />
            執筆者受取: {formatCurrency(permission.feeAmount - permission.platformFee)}
          </p>
        )}
      </Section>

      {/* 許可証情報 */}
      {permission.permissionNumber && (
        <Section label="許可証">
          <p className="font-mono text-xs text-gray-900">
            {permission.permissionNumber}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full gap-1.5"
            render={
              <a
                href={`/api/permissions/${permission.id}/certificate`}
                download
              >
                <Download className="h-3.5 w-3.5" />
                許可証をダウンロード
              </a>
            }
          />
        </Section>
      )}

      {/* 決済ボタン（申請者のみ、approved状態） */}
      {isApplicant && permission.status === "approved" && (
        <Section label="決済">
          <PaymentButton
            permissionId={permission.id}
            feeAmount={permission.feeAmount}
            expiresAt={permission.expiresAt}
            authorStripeReady={detail.authorStripeReady}
          />
        </Section>
      )}

      {/* 却下理由・取り下げ理由 */}
      {permission.rejectionReason && (
        <Section label="却下理由">
          <p className="whitespace-pre-wrap text-gray-700">
            {permission.rejectionReason}
          </p>
        </Section>
      )}
      {permission.revisionReason && permission.status === "revision_requested" && (
        <Section label="修正依頼">
          <p className="whitespace-pre-wrap text-gray-700">
            {permission.revisionReason}
          </p>
        </Section>
      )}
      {permission.withdrawnReason && (
        <Section label="取り下げ理由">
          <p className="whitespace-pre-wrap text-gray-700">
            {permission.withdrawnReason}
          </p>
        </Section>
      )}

      {/* 添付ファイル（Phase 3で充実） */}
      {detail.attachments.length > 0 && (
        <Section label="添付ファイル">
          <ul className="space-y-1">
            {detail.attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-1 text-xs">
                <FileText className="h-3 w-3 text-gray-400" />
                {a.fileName}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 border-b border-gray-100 pb-4 last:mb-0 last:border-0 last:pb-0">
      <p className="mb-1 text-xs text-gray-400">{label}</p>
      {children}
    </div>
  );
}
