import { beforeEach, describe, expect, it, vi } from "vitest";

// 公開・非公開の切り替え: 公開日は最初に公開した日のまま残し、通知は初めての公開のときだけ送る
const play = { id: "p1", authorId: "u1", title: "島の灯台守", isPublished: false, publishedAt: null as Date | null };
const update = vi.fn();
const notify = vi.fn();

vi.mock("@/lib/auth-helpers", () => ({
  requireUserId: async () => "u1",
  getPlayIfOwner: async () => ({ ...play }),
}));
vi.mock("@/lib/db", () => ({ prisma: { palettePlay: { update: (a: unknown) => update(a) } } }));
vi.mock("@/actions/follows", () => ({ getFollowerIdsOf: async () => ["f1", "f2"] }));
vi.mock("@/actions/notifications", () => ({ createNotification: (a: unknown) => notify(a) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { togglePublish } = await import("@/actions/plays");

beforeEach(() => {
  update.mockReset();
  notify.mockReset();
});

describe("togglePublish", () => {
  it("初めて公開するときは公開日を入れ、フォロワーに知らせる", async () => {
    Object.assign(play, { isPublished: false, publishedAt: null });
    expect(await togglePublish("p1")).toEqual({ success: true, isPublished: true });
    expect(update.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("非公開にしても公開日は消さない", async () => {
    const first = new Date("2026-11-01T00:00:00Z");
    Object.assign(play, { isPublished: true, publishedAt: first });
    expect(await togglePublish("p1")).toEqual({ success: true, isPublished: false });
    expect(update.mock.calls[0][0].data).toEqual({ isPublished: false });
  });

  it("公開し直しても、公開日は最初の日のままで、通知も送らない", async () => {
    const first = new Date("2026-11-01T00:00:00Z");
    Object.assign(play, { isPublished: false, publishedAt: first });
    expect(await togglePublish("p1")).toEqual({ success: true, isPublished: true });
    expect(update.mock.calls[0][0].data).toEqual({ isPublished: true, publishedAt: first });
    expect(notify).not.toHaveBeenCalled();
  });
});
