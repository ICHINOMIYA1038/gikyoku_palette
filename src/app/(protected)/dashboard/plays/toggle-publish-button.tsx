"use client";

import { useState } from "react";
import { togglePublish } from "@/actions/plays";
import { Button } from "@/components/ui/button";

export function TogglePublishButton({
  playId,
  isPublished,
}: {
  playId: string;
  isPublished: boolean;
}) {
  const [published, setPublished] = useState(isPublished);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const result = await togglePublish(playId);
    if (result.success) {
      setPublished(result.isPublished);
    }
    setLoading(false);
  };

  return (
    <Button
      variant={published ? "destructive" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "処理中..." : published ? "非公開にする" : "公開する"}
    </Button>
  );
}
