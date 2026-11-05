import { describe, expect, it } from "vitest";
import { MAX_BODY_CHARS, parseImport } from "../../src/lib/editor-import";

const base = { scriptId: "s1", revision: 3, title: " 題 ", body: "太郎　やあ" };

describe("戯曲エディタからの本文の検証", () => {
  it("正しい入力を受け、題名の前後の空白を落とす", () => {
    expect(parseImport(base, true)).toEqual({ scriptId: "s1", revision: 3, title: "題", body: "太郎　やあ" });
  });

  it("空の題名は「無題の作品」にする", () => {
    expect(parseImport({ ...base, title: "  " }, true)).toMatchObject({ title: "無題の作品" });
  });

  it("更新では題名を求めない", () => {
    const { title: _title, ...rest } = base;
    expect(parseImport(rest, false)).toMatchObject({ scriptId: "s1", revision: 3 });
    expect(parseImport(rest, true)).toBe("invalid_title");
  });

  it("不正な入力を理由つきで拒否する", () => {
    expect(parseImport(null, true)).toBe("invalid_body");
    expect(parseImport({ ...base, scriptId: "" }, true)).toBe("invalid_script_id");
    expect(parseImport({ ...base, revision: 0 }, true)).toBe("invalid_revision");
    expect(parseImport({ ...base, revision: 1.5 }, true)).toBe("invalid_revision");
    expect(parseImport({ ...base, body: 1 }, true)).toBe("invalid_body");
  });

  it("上限を超える本文は too_large にする", () => {
    expect(parseImport({ ...base, body: "あ".repeat(MAX_BODY_CHARS + 1) }, true)).toBe("too_large");
    expect(parseImport({ ...base, body: "あ".repeat(MAX_BODY_CHARS) }, true)).toMatchObject({ revision: 3 });
  });
});
