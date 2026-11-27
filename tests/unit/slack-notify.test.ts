import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 運営への知らせ（Slack の #x-posts）: 送信は差し替え、形・エスケープ・失敗しても止めないことを確かめる
const waitUntil = vi.fn();
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ ctx: { waitUntil } }) }));

const { escapeSlack, notifyPlayPublished } = await import("@/lib/slack-notify");

const HOOK = "https://hooks.example.test/posts";
const fetchMock = vi.fn();
const play = { id: "p1", title: "島の灯台守", authorName: "灯台の人", republished: false };

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response("ok"));
  waitUntil.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("SLACK_WEBHOOK_URL_POSTS", HOOK);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("escapeSlack", () => {
  it("& < > を直す（& を先に）", () => {
    expect(escapeSlack("<!channel> & <https://x.test|a>")).toBe("&lt;!channel&gt; &amp; &lt;https://x.test|a&gt;");
  });
});

describe("notifyPlayPublished", () => {
  it("題・作者・作品ページの URL を決まった形で送り、waitUntil に預ける", async () => {
    await notifyPlayPublished(play);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(HOOK);
    expect(init.method).toBe("POST");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body)).toEqual({
      text: "[戯曲パレット] 📖 戯曲が公開されました：「島の灯台守」",
      blocks: [
        { type: "context", elements: [{ type: "mrkdwn", text: "*戯曲パレット*" }] },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*戯曲が公開されました*\n題：島の灯台守\n作者：灯台の人\n<https://palette.gikyokutosyokan.com/plays/p1>",
          },
        },
      ],
    });
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it("公開し直しは、そうと分かる文にする", async () => {
    await notifyPlayPublished({ ...play, republished: true });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toBe("[戯曲パレット] 📖 戯曲が再び公開されました：「島の灯台守」");
  });

  it("利用者が入力した題と表示名をエスケープする", async () => {
    await notifyPlayPublished({ ...play, title: "<!channel> A&B", authorName: "<@U1>" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toContain("&lt;!channel&gt; A&amp;B");
    expect(body.blocks[1].text.text).toContain("題：&lt;!channel&gt; A&amp;B\n作者：&lt;@U1&gt;");
    expect(body.blocks[1].text.text).not.toContain("<!channel>");
  });

  it("送り先が未設定なら送らず、ログに 1 行だけ出す", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL_POSTS", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await notifyPlayPublished(play);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("送信が失敗しても例外を出さず、送り先の URL をログに出さない", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError(`fetch failed ${HOOK}`));
    await expect(notifyPlayPublished(play)).resolves.toBeUndefined();
    fetchMock.mockResolvedValue(new Response("no_service", { status: 404 }));
    await expect(notifyPlayPublished(play)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(error.mock.calls)).not.toContain(HOOK);
  });
});
