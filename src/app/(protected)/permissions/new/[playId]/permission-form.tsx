"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createPermission } from "@/actions/permissions";
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
import { formatCurrency } from "@/lib/utils";

type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  permissionId?: string;
} | null;

export function PermissionForm({
  playId,
  playTitle,
  isFree,
  feeAmount,
}: {
  playId: string;
  playTitle: string;
  isFree: boolean;
  feeAmount: number;
}) {
  const router = useRouter();

  async function formAction(
    _prevState: FormState,
    formData: FormData
  ): Promise<FormState> {
    const result = await createPermission(playId, formData);
    if (result.success && result.threadId) {
      router.push(`/threads/${result.threadId}`);
    }
    return result;
  }

  const [state, action, isPending] = useActionState(formAction, null);

  return (
    <form action={action}>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>上演料</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {isFree ? "無料" : formatCurrency(feeAmount)}
          </p>
          {!isFree && (
            <p className="text-sm text-muted-foreground">
              ※承認後に決済を行います
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>申請情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organizationName">団体名 *</Label>
              <Input id="organizationName" name="organizationName" required />
              {state?.fieldErrors?.organizationName && (
                <p className="text-sm text-destructive">{state.fieldErrors.organizationName[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="representativeName">代表者名 *</Label>
              <Input id="representativeName" name="representativeName" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="performanceTitle">公演名 *</Label>
            <Input id="performanceTitle" name="performanceTitle" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">公演開始日 *</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">公演終了日 *</Label>
              <Input id="endDate" name="endDate" type="date" required />
              {state?.fieldErrors?.endDate && (
                <p className="text-sm text-destructive">{state.fieldErrors.endDate[0]}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="venueName">会場名 *</Label>
              <Input id="venueName" name="venueName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venueLocation">会場所在地 *</Label>
              <Input id="venueLocation" name="venueLocation" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="expectedAudience">想定観客数 *</Label>
              <Input id="expectedAudience" name="expectedAudience" type="number" min="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticketType">チケット *</Label>
              <Select name="ticketType" required>
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
              <Input id="numPerformances" name="numPerformances" type="number" min="1" defaultValue="1" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicantMessage">メッセージ（任意）</Label>
            <Textarea
              id="applicantMessage"
              name="applicantMessage"
              placeholder="執筆者への意気込みやメッセージなど"
              rows={4}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" size="lg" disabled={isPending} className="w-full">
            {isPending ? "送信中..." : "申請を送信する"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
