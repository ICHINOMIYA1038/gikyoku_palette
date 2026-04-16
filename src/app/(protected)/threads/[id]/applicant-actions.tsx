"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { withdrawPermission } from "@/actions/permissions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PermissionInThread } from "@/types/thread";

type Props = {
  permission: PermissionInThread;
  onActed: () => void;
};

/**
 * 申請者のアクションバー（タイムライン直下）。
 * - status=revision_requested: 「修正版を提出する」が最重要 → 編集ページへ
 * - 取り下げボタンは pending/approved/revision_requested のいずれでも出す
 */
export function ApplicantActions({ permission, onActed }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canWithdraw = ["pending", "approved", "revision_requested"].includes(
    permission.status
  );
  const needsResubmit = permission.status === "revision_requested";

  if (!canWithdraw && !needsResubmit) return null;

  const handleWithdraw = async () => {
    setSubmitting(true);
    setError(null);
    const res = await withdrawPermission(permission.id, reason || undefined);
    setSubmitting(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setConfirming(false);
    setReason("");
    onActed();
  };

  if (needsResubmit && !confirming) {
    return (
      <div className="mt-4 space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
        <p className="text-sm text-orange-800">
          作家から修正依頼が届いています。内容を編集して再提出してください。
        </p>
        {permission.revisionReason && (
          <p className="rounded border border-orange-200 bg-white px-2 py-1 text-xs text-orange-900">
            {permission.revisionReason}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            render={
              <Link href={`/permissions/${permission.id}/edit`}>
                <Pencil className="h-3.5 w-3.5" />
                編集して再提出する
              </Link>
            }
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 text-gray-500"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            申請を取り下げる
          </Button>
        </div>
      </div>
    );
  }

  if (!confirming) {
    // pending / approved の状態 — 取り下げボタンだけ控えめに表示
    return (
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1.5 text-gray-400 hover:text-red-600"
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          申請を取り下げる
        </Button>
      </div>
    );
  }

  // 取り下げ確認モード
  return (
    <div className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">申請を取り下げる</p>
      <p className="text-xs text-gray-500">
        取り下げると、このスレッドではメッセージを送れなくなります。
      </p>
      <div>
        <label className="mb-1 block text-xs text-gray-500">理由（任意）</label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="例: 公演中止のため / 別作品に変更"
          rows={2}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-red-600 hover:text-red-700"
          disabled={submitting}
          onClick={handleWithdraw}
        >
          {submitting ? "処理中..." : "取り下げを確定"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={submitting}
          onClick={() => {
            setConfirming(false);
            setReason("");
            setError(null);
          }}
        >
          戻る
        </Button>
      </div>
    </div>
  );
}
