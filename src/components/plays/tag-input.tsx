"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

const MAX_TAGS = 10;
const MAX_LEN = 30;

type Props = {
  /** name=tagNames[] として submit される */
  name?: string;
  defaultValue?: string[];
};

/**
 * 自由入力タグ。Enter / , / スペース で確定。
 * 内部的に hidden input (name="tagNames") を配列で送出する。
 */
export function TagInput({ name = "tagNames", defaultValue = [] }: Props) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [text, setText] = useState("");

  function commit(value: string) {
    const v = value.trim().slice(0, MAX_LEN);
    if (!v) return;
    if (tags.includes(v)) {
      setText("");
      return;
    }
    if (tags.length >= MAX_TAGS) return;
    setTags((prev) => [...prev, v]);
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(text);
    } else if (e.key === "Backspace" && !text && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  return (
    <div className="rounded-md border border-gray-300 bg-white p-2 focus-within:border-pink-400 focus-within:ring-1 focus-within:ring-pink-200">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-pink-50 border border-pink-200 px-2.5 py-0.5 text-xs font-medium text-pink-700"
          >
            #{t}
            <button
              type="button"
              onClick={() =>
                setTags((prev) => prev.filter((x) => x !== t))
              }
              className="text-pink-400 hover:text-pink-600"
              aria-label={`${t} を削除`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(text)}
          placeholder={
            tags.length === 0
              ? "タグを入力してEnter (例: 現代劇 コメディ)"
              : tags.length >= MAX_TAGS
                ? `最大${MAX_TAGS}個まで`
                : "追加する..."
          }
          maxLength={MAX_LEN}
          disabled={tags.length >= MAX_TAGS}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
        />
      </div>

      {/* hidden submits */}
      {tags.map((t) => (
        <input key={`h-${t}`} type="hidden" name={name} value={t} />
      ))}

      <p className="mt-1 px-1 text-[11px] text-gray-400">
        Enter / カンマで確定 ・ 最大{MAX_TAGS}個
      </p>
    </div>
  );
}
