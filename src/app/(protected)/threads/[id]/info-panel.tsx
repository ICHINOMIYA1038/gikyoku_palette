import { Calendar, MapPin, Users, FileText, Download, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThreadDetail } from "@/types/thread";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentButton } from "./payment-button";

/**
 * スレッド右ペインの企画情報パネル。
 * 設計方針:
 *  1. 「アクション可能」な情報を上に（決済ボタン・許可証）
 *  2. 「契約に必要」な構造化情報を中段（団体・公演内容・料金）
 *  3. 「補足」を下に（添付・修正/却下/取り下げ理由）
 */
export function InfoPanel({ detail }: { detail: ThreadDetail }) {
  const { permission, role } = detail;
  const isApplicant = role === "applicant";
  const showPaymentCta =
    isApplicant && permission.status === "approved";
  const showPermissionNumber = !!permission.permissionNumber;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* 1. アクション帯：許可証 or 決済 — 一番目立つ位置 */}
      {showPermissionNumber && (
        <div className="border-b border-gray-100 bg-emerald-50/50 p-4">
          <div className="flex items-start gap-2">
            <Award className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider text-emerald-700">
                許可証発行済み
              </p>
              <p className="mt-0.5 font-mono text-sm font-medium text-gray-900">
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
            </div>
          </div>
        </div>
      )}

      {showPaymentCta && (
        <div className="border-b border-gray-100 bg-amber-50/50 p-4">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-amber-700">
            お支払い
          </p>
          <PaymentButton
            permissionId={permission.id}
            feeAmount={permission.feeAmount}
            expiresAt={permission.expiresAt}
            authorStripeReady={detail.authorStripeReady}
          />
        </div>
      )}

      {/* 2. 構造化情報 */}
      <div className="space-y-4 p-4 text-sm">
        <Field label="団体">
          <p className="font-medium text-gray-900">
            {permission.organizationName}
          </p>
          <p className="text-xs text-gray-500">
            代表 {permission.representativeName}
          </p>
        </Field>

        <Field label="公演">
          <p className="font-medium text-gray-900">
            {permission.performanceTitle}
          </p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-gray-500">
            <li className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-gray-400" />
              {formatDate(permission.startDate)} 〜{" "}
              {formatDate(permission.endDate)}
            </li>
            <li className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
              <span>
                {permission.venueName}
                <span className="text-gray-400"> ({permission.venueLocation})</span>
              </span>
            </li>
            <li className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-gray-400" />
              想定 {permission.expectedAudience.toLocaleString()}人 / 上演{" "}
              {permission.numPerformances}回
            </li>
          </ul>
        </Field>

        <Field label="上演料">
          {permission.feeAmount === 0 ? (
            <p className="text-base font-medium text-gray-900">無料</p>
          ) : (
            <>
              <p className="text-base font-medium text-gray-900">
                {formatCurrency(permission.feeAmount)}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                手数料 {formatCurrency(permission.platformFee)} / 執筆者受取{" "}
                {formatCurrency(permission.feeAmount - permission.platformFee)}
              </p>
            </>
          )}
        </Field>

        {/* 3. 補足: 修正依頼 / 却下 / 取り下げの理由 */}
        {permission.revisionReason &&
          permission.status === "revision_requested" && (
            <ReasonBox tone="orange" label="修正依頼">
              {permission.revisionReason}
            </ReasonBox>
          )}
        {permission.rejectionReason && (
          <ReasonBox tone="rose" label="却下理由">
            {permission.rejectionReason}
          </ReasonBox>
        )}
        {permission.withdrawnReason && (
          <ReasonBox tone="slate" label="取り下げ理由">
            {permission.withdrawnReason}
          </ReasonBox>
        )}

        {/* 添付 */}
        {detail.attachments.length > 0 && (
          <Field label="添付ファイル">
            <ul className="space-y-1">
              {detail.attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-1.5 text-xs">
                  <FileText className="h-3 w-3 text-gray-400" />
                  <a
                    href={`/api/attachments/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-700 hover:text-pink-600"
                  >
                    {a.fileName}
                  </a>
                </li>
              ))}
            </ul>
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-wider text-gray-400">
        {label}
      </p>
      {children}
    </div>
  );
}

const REASON_TONES: Record<string, string> = {
  orange: "border-orange-200 bg-orange-50 text-orange-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

function ReasonBox({
  tone,
  label,
  children,
}: {
  tone: keyof typeof REASON_TONES;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${REASON_TONES[tone]}`}>
      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider opacity-70">
        {label}
      </p>
      <p className="whitespace-pre-wrap">{children}</p>
    </div>
  );
}
