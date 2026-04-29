type PlayBodyProps = {
  body: string;
  /** 'rtl' のとき縦書き表示 (writing-mode: vertical-rl) */
  direction?: "ltr" | "rtl";
};

export function PlayBody({ body, direction = "ltr" }: PlayBodyProps) {
  if (direction === "rtl") {
    // 縦書き: 画面幅いっぱいに横スクロール、高さは読みやすい固定サイズ
    return (
      <div className="rounded-lg border bg-white">
        <div
          className="overflow-x-auto overflow-y-hidden px-6 py-8 sm:px-10 sm:py-10"
          style={{ maxHeight: "80vh" }}
        >
          <pre
            className="whitespace-pre-wrap break-words font-serif text-base leading-[2]"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "upright",
              // 縦書きでは高さが読解方向の長さ
              height: "calc(80vh - 4rem)",
              minHeight: "500px",
            }}
          >
            {body}
          </pre>
        </div>
        <p className="border-t border-gray-100 px-4 py-2 text-[10px] text-gray-400">
          縦書きモード ・ 右から左へ読み進めます
        </p>
      </div>
    );
  }

  // 横書き（既存）
  return (
    <div className="rounded-lg border bg-white p-6 sm:p-8">
      <pre className="whitespace-pre-wrap break-words font-serif text-base leading-[1.8]">
        {body}
      </pre>
    </div>
  );
}
