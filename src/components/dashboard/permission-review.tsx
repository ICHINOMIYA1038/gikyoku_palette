"use client";

import { useState } from "react";
import { approvePermission, rejectPermission } from "@/actions/permissions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function PermissionReview({
  permissionId,
  expanded: initialExpanded = false,
}: {
  permissionId: string;
  expanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    const res = await approvePermission(permissionId, message || undefined);
    if (res.error) {
      setResult(res.error);
    } else {
      setResult("承認しました");
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setResult("却下理由を入力してください");
      return;
    }
    setLoading(true);
    const res = await rejectPermission(permissionId, reason, message || undefined);
    if (res.error) {
      setResult(res.error);
    } else {
      setResult("却下しました");
    }
    setLoading(false);
  };

  if (result) {
    return <p className="mt-3 text-sm text-muted-foreground">{result}</p>;
  }

  if (!expanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => setExpanded(true)}
      >
        審査する
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      {action === null && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAction("approve")}>
            承認する
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setAction("reject")}
          >
            却下する
          </Button>
        </div>
      )}

      {action === "reject" && (
        <div className="space-y-2">
          <Label>却下理由 *</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="却下理由を入力してください"
            required
          />
        </div>
      )}

      {action !== null && (
        <>
          <div className="space-y-2">
            <Label>メッセージ（任意）</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="申請者へのメッセージ"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={loading}
              onClick={action === "approve" ? handleApprove : handleReject}
            >
              {loading ? "処理中..." : action === "approve" ? "承認を確定" : "却下を確定"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAction(null)}
              disabled={loading}
            >
              戻る
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
