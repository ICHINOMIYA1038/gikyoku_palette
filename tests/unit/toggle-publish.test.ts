import { beforeEach, describe, expect, it, vi } from "vitest";

// 公開・非公開の切り替え: 公開日は最初に公開した日のまま残し、通知は初めての公開のときだけ送る
const play = { id: "p1", authorId: "u1", title: "島の灯台守", isPublished: false, publishedAt: null as Date | null };
const update = vi.fn();
const notify = vi.fn();
const slack = vi.fn();

vi.mock("@/lib/auth-helpers", () => ({
  requireUserId: async () => "u1",
  getPlayIfOwner: async () => ({ ...play }),
}));
vi.mock("@/lib/db", () => ({ prisma: { palettePlay: { update: (a: unknown) => update(a) } } }));
vi.mock("@/actions/follows", () => ({ getFollowerIdsOf: async () => ["f1", "f2"] }));
vi.mock("@/actions/notifications", () => ({ createNotification: (a: unknown) => notify(a) }));
vi.mock("@/lib/users", () => ({ getPublicUser: async () => ({ id: "u1", name: "本名 太郎", displayName: "灯台の人", avatarUrl: null }) }));
vi.mock("@/lib/slack-notify", () => ({ notifyPlayPublished: (a: unknown) => slack(a) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { togglePublish } = await import("@/actions/plays");

beforeEach(() => {
  update.mockReset();
  notify.mockReset();
  slack.mockReset();
});

describe("togglePublish", () => {
  it("初めて公開するときは公開日を入れ、フォロワーに知らせる", async () => {
    Object.assign(play, { isPublished: false, publishedAt: null });
    expect(await togglePublish("p1")).toEqual({ success: true, isPublished: true });
    expect(update.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
    expect(notify).toHaveBeenCalledTimes(2);
    // 運営には題・表示名（本名ではない）・作品の id を渡す
    expect(slack).toHaveBeenCalledWith({ id: "p1", title: "島の灯台守", authorName: "灯台の人", republished: false });
  });

  it("非公開にしても公開日は消さない", async () => {
    const first = new Date("2026-11-01T00:00:00Z");
    Object.assign(play, { isPublished: true, publishedAt: first });
    expect(await togglePublish("p1")).toEqual({ success: true, isPublished: false });
    expect(update.mock.calls[0][0].data).toEqual({ isPublished: false });
    expect(slack).not.toHaveBeenCalled();
  });

  it("公開し直しても、公開日は最初の日のままで、通知も送らない", async () => {
    const first = new Date("2026-11-01T00:00:00Z");
    Object.assign(play, { isPublished: false, publishedAt: first });
    expect(await togglePublish("p1")).toEqual({ success: true, isPublished: true });
    expect(update.mock.calls[0][0].data).toEqual({ isPublished: true, publishedAt: first });
    expect(notify).not.toHaveBeenCalled();
    // 運営には公開し直しも知らせる
    expect(slack).toHaveBeenCalledWith(expect.objectContaining({ id: "p1", republished: true }));
  });

  it("運営への知らせが失敗しても、公開は成功として返す", async () => {
    Object.assign(play, { isPublished: false, publishedAt: null });
    slack.mockImplementation(() => {
      throw new Error("boom");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await togglePublish("p1")).toEqual({ success: true, isPublished: true });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
