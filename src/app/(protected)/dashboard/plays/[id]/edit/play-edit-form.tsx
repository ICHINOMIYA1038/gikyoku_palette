"use client";

import { useActionState } from "react";
import { updatePlay } from "@/actions/plays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Play, Genre } from "@prisma/client";

type FormState = { error?: string; success?: boolean } | null;

type PlayWithGenres = Play & {
  genres: { genre: Genre }[];
};

export function PlayEditForm({
  play,
  genres: _genres,
}: {
  play: PlayWithGenres;
  genres: Genre[];
}) {
  async function formAction(
    _prevState: FormState,
    formData: FormData
  ): Promise<FormState> {
    return await updatePlay(play.id, formData);
  }

  const [state, action, isPending] = useActionState(formAction, null);

  return (
    <form action={action}>
      <Card>
        <CardHeader>
          <CardTitle>作品情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">タイトル</Label>
            <Input id="title" name="title" defaultValue={play.title} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="synopsis">あらすじ</Label>
            <Textarea id="synopsis" name="synopsis" defaultValue={play.synopsis} rows={4} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">上演時間（分）</Label>
              <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue={play.durationMinutes} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="castTotal">出演人数（合計）</Label>
              <Input id="castTotal" name="castTotal" type="number" defaultValue={play.castTotal} required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="castMale">男性</Label>
              <Input id="castMale" name="castMale" type="number" defaultValue={play.castMale} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="castFemale">女性</Label>
              <Input id="castFemale" name="castFemale" type="number" defaultValue={play.castFemale} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="castOther">不問</Label>
              <Input id="castOther" name="castOther" type="number" defaultValue={play.castOther} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feeAmount">上演料（円、0で無料）</Label>
              <Input id="feeAmount" name="feeAmount" type="number" defaultValue={play.feeAmount} min="0" />
            </div>
            <div className="flex items-end">
              <input type="hidden" name="isFree" value={play.feeAmount === 0 ? "true" : "false"} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "保存中..." : "保存する"}
          </Button>
          {state?.success && <p className="text-sm text-green-600">保存しました</p>}
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </CardFooter>
      </Card>
    </form>
  );
}
