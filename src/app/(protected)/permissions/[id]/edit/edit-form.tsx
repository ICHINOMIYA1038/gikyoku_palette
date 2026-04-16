"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { resubmitPermission } from "@/actions/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { firstString, type FormValues } from "@/lib/form-values";

type DefaultValues = {
  organizationName: string;
  representativeName: string;
  performanceTitle: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  venueName: string;
  venueLocation: string;
  expectedAudience: number;
  ticketType: "free" | "paid";
  numPerformances: number;
};

type FormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      success?: boolean;
      values?: FormValues;
    }
  | null;

/**
 * 修正版の再提出フォーム。
 * 構造は new permission form とほぼ同じだが defaultValue が埋まっており、
 * resubmitPermission に submit する。成功時はスレッドへ戻す。
 */
export function EditPermissionForm({
  permissionId,
  threadId,
  defaultValues,
}: {
  permissionId: string;
  threadId: string | null;
  defaultValues: DefaultValues;
}) {
  const router = useRouter();

  async function action(_prev: FormState, formData: FormData): Promise<FormState> {
    const result = await resubmitPermission(permissionId, formData);
    if (result.success && threadId) {
      router.push(`/threads/${threadId}`);
    }
    return result;
  }

  const [state, formAction, pending] = useActionState(action, null);

  // validation失敗時は直前入力を優先、そうでなければ defaultValues を表示
  const v = state?.values;
  const sv = (key: string, fallback: string | number): string | number => {
    const fromLast = firstString(v?.[key]);
    return fromLast !== undefined ? fromLast : fallback;
  };

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>申請情報（修正）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organizationName">団体名 *</Label>
              <Input
                id="organizationName"
                name="organizationName"
                defaultValue={sv("organizationName", defaultValues.organizationName)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="representativeName">代表者名 *</Label>
              <Input
                id="representativeName"
                name="representativeName"
                defaultValue={sv("representativeName", defaultValues.representativeName)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="performanceTitle">公演名 *</Label>
            <Input
              id="performanceTitle"
              name="performanceTitle"
              defaultValue={sv("performanceTitle", defaultValues.performanceTitle)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">公演開始日 *</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={sv("startDate", defaultValues.startDate)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">公演終了日 *</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={sv("endDate", defaultValues.endDate)}
                required
              />
              {state?.fieldErrors?.endDate && (
                <p className="text-sm text-destructive">{state.fieldErrors.endDate[0]}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="venueName">会場名 *</Label>
              <Input
                id="venueName"
                name="venueName"
                defaultValue={sv("venueName", defaultValues.venueName)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venueLocation">会場所在地 *</Label>
              <Input
                id="venueLocation"
                name="venueLocation"
                defaultValue={sv("venueLocation", defaultValues.venueLocation)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="expectedAudience">想定観客数 *</Label>
              <Input
                id="expectedAudience"
                name="expectedAudience"
                type="number"
                min="1"
                defaultValue={sv("expectedAudience", defaultValues.expectedAudience)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticketType">チケット *</Label>
              <Select
                name="ticketType"
                defaultValue={String(sv("ticketType", defaultValues.ticketType))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">無料</SelectItem>
                  <SelectItem value="paid">有料</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numPerformances">上演回数 *</Label>
              <Input
                id="numPerformances"
                name="numPerformances"
                type="number"
                min="1"
                defaultValue={sv("numPerformances", defaultValues.numPerformances)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicantMessage">作家へのメッセージ（任意）</Label>
            <Textarea
              id="applicantMessage"
              name="applicantMessage"
              placeholder="どこを修正したか・補足説明など"
              rows={4}
              defaultValue={firstString(v?.applicantMessage) ?? ""}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "送信中..." : "修正版を再提出する"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
