"use client";

import { useActionState } from "react";
import { updateProfile } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AvatarUpload } from "@/components/profile/avatar-upload";

type UserProfile = {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
};

type FormState = {
  error?: Record<string, string[]>;
  success?: boolean;
} | null;

async function formAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  return await updateProfile(formData);
}

export function ProfileEditForm({ profile }: { profile: UserProfile }) {
  const [state, action, isPending] = useActionState(formAction, null);

  return (
    <form action={action}>
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>プロフィール画像</Label>
            <AvatarUpload
              initialAvatarUrl={profile.avatarUrl}
              fallbackLabel={profile.displayName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">表示名（ペンネーム）</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={profile.displayName}
              placeholder="表示名を入力"
              required
              maxLength={50}
            />
            {state?.error?.displayName && (
              <p className="text-sm text-destructive">
                {state.error.displayName[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">自己紹介</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={profile.bio || ""}
              placeholder="自己紹介を入力（任意）"
              rows={4}
              maxLength={500}
            />
            {state?.error?.bio && (
              <p className="text-sm text-destructive">{state.error.bio[0]}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? "保存中..." : "保存する"}
          </Button>
          {state?.success && (
            <p className="ml-4 text-sm text-green-600">保存しました</p>
          )}
        </CardFooter>
      </Card>
    </form>
  );
}
