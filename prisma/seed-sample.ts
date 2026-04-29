import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== サンプルデータ投入開始 ===");

  // 1. ユーザー作成（既存2人＋新規3人）
  const now = new Date();
  const users = [
    {
      id: "sample-author-1",
      name: "Taro Yamada",
      email: "taro@example.com",
      displayName: "山田太郎",
      bio: "劇作家。東京都在住。大学時代から脚本を書き始め、数々の小劇場で作品が上演されている。",
      updatedAt: now,
    },
    {
      id: "sample-author-2",
      name: "Hanako Suzuki",
      email: "hanako@example.com",
      displayName: "鈴木花子",
      bio: "ミュージカル脚本家。宝塚歌劇が好き。",
      updatedAt: now,
    },
    {
      id: "sample-author-3",
      name: "Ichiro Tanaka",
      email: "ichiro@example.com",
      displayName: "田中一郎",
      bio: "社会派ドラマを得意とする劇作家。",
      updatedAt: now,
    },
  ];

  for (const u of users) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "public"."User" (id, name, email, "displayName", bio, "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      u.id,
      u.name,
      u.email,
      u.displayName,
      u.bio,
      u.updatedAt
    );
  }
  console.log("ユーザー3人 upsert完了");

  // 2. 作品データ
  const plays = [
    {
      authorId: "sample-author-1",
      title: "夏の終わりに",
      synopsis:
        "大学4年の夏、卒業を控えた4人の男女が、最後の合宿で過去と向き合う。それぞれの秘密が明かされるとき、青春の終わりと新たな始まりが交錯する。",
      body: `【第一幕】

舞台は、海辺の古い民宿。夕日が差し込む和室。

健太（男・22歳）が窓際に座り、海を眺めている。
そこへ美咲（女・22歳）が入ってくる。

美咲「ねえ、健太。覚えてる？ 一年生のとき、ここに来たこと」
健太「……ああ。あのときは、まだ何も知らなかった」
美咲「何も知らなかったって、何を？」
健太「自分がこんなに……変わるってことを」

沈黙。波の音だけが聞こえる。

隣の部屋から、大輔（男・22歳）と理沙（女・21歳）の笑い声が聞こえてくる。
美咲は少し寂しそうに微笑む。

美咲「みんな、変わったよね」
健太「変わらないものなんて、ないんだよ」

（暗転）`,
      durationMinutes: 60,
      castTotal: 4,
      castMale: 2,
      castFemale: 2,
      castOther: 0,
      feeAmount: 0,
      isFree: true,
      viewCount: 234,
      downloadCount: 18,
    },
    {
      authorId: "sample-author-2",
      title: "笑門来福",
      synopsis:
        "商店街の寂れた和菓子屋を舞台に、個性豊かな6人の登場人物がドタバタ劇を繰り広げる。笑いの中に人情の温かさが溢れるコメディ。",
      body: `【第一場】

舞台は「福々堂」という古い和菓子屋の店内。
店主の源蔵（男・60歳）がカウンターで居眠りしている。

妻のトメ（女・58歳）が奥から出てくる。

トメ「ちょっと、お父さん！ またサボってるの！」
源蔵「（飛び起きて）サボってない！ 瞑想だ、瞑想！」
トメ「瞑想って、いびきかいてたわよ」

そこへ常連客の田所（男・45歳）が入ってくる。

田所「おーい、源さん！ 大変だ、大変だ！」
源蔵「何だ、騒々しい。また猫が魚を盗んだか？」
田所「違う違う！ 隣にタピオカ屋ができるって話だ！」
トメ「タピオカ！？ この商店街に！？」
源蔵「何だそのタピオカって。食えるのか？」

（一同、ずっこける）`,
      durationMinutes: 30,
      castTotal: 6,
      castMale: 3,
      castFemale: 3,
      castOther: 0,
      feeAmount: 0,
      isFree: true,
      viewCount: 456,
      downloadCount: 42,
    },
    {
      authorId: "sample-author-3",
      title: "星降る夜の物語",
      synopsis:
        "天文台で働く青年が、星の精霊と出会い、失われた星座を取り戻す冒険に旅立つ。壮大なファンタジーの中に、人間の孤独と希望を描く。",
      body: `【プロローグ】

暗闇の中、無数の星が瞬いている。
やがて一つの星が流れ落ち、舞台が明るくなる。

天文台の屋上。望遠鏡の前に、翔（男・25歳）が座っている。

翔「また一つ、消えた……」

彼の後ろに、淡い光を放つ少女・ルナ（女・年齢不詳）が現れる。

ルナ「あなたには、見えるのね。星が消えていくのが」
翔「（驚いて振り返り）誰だ！？ ここは関係者以外立入禁止だぞ」
ルナ「私は星の番人。あなたの力が必要なの」
翔「力って……僕はただの観測員だ」
ルナ「いいえ。あなたは星の声が聞こえる、最後の人間」

風が吹き、星々がざわめく。
翔の手のひらに、小さな光の欠片が降りてくる。

（暗転、タイトルコール）`,
      durationMinutes: 90,
      castTotal: 8,
      castMale: 3,
      castFemale: 3,
      castOther: 2,
      feeAmount: 5000,
      isFree: false,
      viewCount: 187,
      downloadCount: 12,
    },
    {
      authorId: "sample-author-1",
      title: "東京バタフライ",
      synopsis:
        "東京の片隅で暮らす3人の女性たちの、静かで切実な日常。それぞれの孤独が交差するとき、小さな奇跡が生まれる。",
      body: `【場面1】

都内のワンルームマンション。夜。
由香（女・28歳）がパソコンに向かって仕事をしている。
隣の部屋から壁を叩く音。

由香「……また怒られた」

携帯が鳴る。出ない。留守番電話に切り替わる。

母の声『由香、お母さんだけど。最近連絡ないけど、元気にしてる？ お父さんも心配してるから──』

由香は携帯の電源を切る。

由香「元気だよ。……たぶん」

インターホンが鳴る。
ドアを開けると、隣人の真理（女・35歳）が立っている。

真理「あの、すみません。砂糖を少し分けてもらえませんか」
由香「砂糖……ですか」
真理「夜中にケーキが焼きたくなって。変ですよね」
由香「（少し笑って）いえ、分かります。そういう夜」

（場面転換）`,
      durationMinutes: 45,
      castTotal: 3,
      castMale: 1,
      castFemale: 2,
      castOther: 0,
      feeAmount: 0,
      isFree: true,
      viewCount: 312,
      downloadCount: 25,
    },
    {
      authorId: "sample-author-2",
      title: "タイムカプセル",
      synopsis:
        "2050年の日本。AIが社会を管理する世界で、5人の若者がタイムカプセルを掘り起こし、30年前の「人間らしさ」と向き合うSFドラマ。",
      body: `【ACT 1】

2050年、東京。
白い壁に囲まれた清潔な部屋。中央にホログラムモニター。

アキラ（男・20歳）がモニターに話しかけている。

アキラ「ARIA、今日の予定は？」
ARIA（AI音声）「午前：第7区での環境モニタリング。午後：自由時間。夕方：コミュニティ会議」
アキラ「自由時間か。何しよう」
ARIA「推奨アクティビティを提示します。ジョギング、読書、瞑想──」
アキラ「いいよ、自分で決める」
ARIA「了解しました。ただし、非推奨行動をとった場合は記録されます」

アキラは窓の外を見る。完璧に整備された街並み。

そこへ、ミサキ（女・21歳）が駆け込んでくる。

ミサキ「アキラ！ 大変、古い校庭の跡地で何か見つけた！」
アキラ「何かって？」
ミサキ「金属の箱。上に『2020年 6年3組』って書いてある」

（緊張した空気が流れる）`,
      durationMinutes: 75,
      castTotal: 5,
      castMale: 2,
      castFemale: 2,
      castOther: 1,
      feeAmount: 3000,
      isFree: false,
      viewCount: 145,
      downloadCount: 8,
    },
    {
      authorId: "sample-author-3",
      title: "春を待つ人々",
      synopsis:
        "雪深い北国の温泉旅館を舞台にしたミュージカル。旅館の存続をかけて奮闘する家族と従業員たちの歌と涙の物語。",
      body: `【第一幕 第一場】

雪の降る温泉旅館「春風荘」の玄関。

♪ オープニングナンバー「雪の中の灯」

従業員一同が歌いながら掃除をしている。

全員「♪ 雪は降り積もる この山の宿に
     春はまだ遠い だけど灯は消さない
     お客様を迎える その笑顔のために
     今日もここで 私たちは待っている」

女将のサチ（女・55歳）が登場。

サチ「みなさん、おはようございます。今日も予約は……」
番頭のタケシ（男・50歳）「……ゼロです、女将さん」
サチ「そう。でも、いつお客様がいらしてもいいように」

♪「いつか春が来る」（サチのソロ）

サチ「♪ 父が守った この宿を
     母が磨いた この廊下を
     私は誰に 渡せばいいの
     いつか春が来ると 信じているけれど」

（涙を拭い、笑顔を作る）`,
      durationMinutes: 120,
      castTotal: 12,
      castMale: 5,
      castFemale: 5,
      castOther: 2,
      feeAmount: 10000,
      isFree: false,
      viewCount: 89,
      downloadCount: 3,
    },
    {
      authorId: "sample-author-1",
      title: "深夜のカフェで",
      synopsis:
        "終電を逃した男女が深夜のカフェで偶然出会い、朝までの数時間で人生の転機を迎える。軽妙な会話劇。",
      body: `【全一幕】

深夜1時。都内の小さなカフェ。
BGMにジャズが流れている。

カウンターに座る亮介（男・30歳）。コーヒーカップを手に。
ドアが開き、麻衣（女・28歳）が入ってくる。

麻衣「まだやってるんですね、ここ」
マスター（声のみ）「朝5時までやってますよ」
麻衣「じゃあ、ホットミルクを」

麻衣がカウンターの隅に座る。
しばらくの沈黙。

亮介「……終電、逃しました？」
麻衣「え？ ああ、はい」
亮介「僕もです。乾杯しますか、終電逃し同盟」
麻衣「（笑って）何ですかそれ」

亮介「人生で一番大事な決断って、いつしました？」
麻衣「いきなり重いですね」
亮介「深夜のカフェですから。深い話しか許されないんです」
麻衣「誰が決めたんですか、そのルール」
亮介「たった今、僕が」

（二人、笑う）`,
      durationMinutes: 20,
      castTotal: 2,
      castMale: 1,
      castFemale: 1,
      castOther: 0,
      feeAmount: 0,
      isFree: true,
      viewCount: 498,
      downloadCount: 47,
    },
    {
      authorId: "sample-author-3",
      title: "鬼の涙",
      synopsis:
        "戦国時代、鬼と恐れられた武将の知られざる一面を描く時代劇。戦場で鬼となった男が、一人の少女との出会いで人間性を取り戻す。",
      body: `【第一幕】

戦国時代、ある城の大広間。
武将・鬼丸（男・40歳）が家臣たちを前に座している。

鬼丸「明日の合戦、我らの勝利は揺るがぬ」
家臣・源次（男・35歳）「殿、敵の兵力は我らの倍。いかがなさいます」
鬼丸「倍だと？ ならば一人で二人斬ればよいだけのこと」

家臣たち、畏怖の表情。

源次「……殿を『鬼』と呼ぶ者がおりますが」
鬼丸「好きに呼ばせておけ。鬼が勝つなら、鬼で結構」

夜。城の裏手、月明かりの庭。
鬼丸が一人で月を見上げている。

そこへ、小さな影。戦災孤児のタエ（女・10歳）が迷い込んでくる。

タエ「……お侍さま、お水をください」
鬼丸「（振り返り）何者だ。どこから入った」
タエ「お腹が空いて……。殺さないで」

鬼丸の手が止まる。少女の目に、恐怖と懇願が混じっている。

鬼丸「…………座れ」

（暗転）`,
      durationMinutes: 60,
      castTotal: 7,
      castMale: 5,
      castFemale: 2,
      castOther: 0,
      feeAmount: 5000,
      isFree: false,
      viewCount: 203,
      downloadCount: 15,
    },
    {
      authorId: "sample-author-2",
      title: "闇夜の訪問者",
      synopsis:
        "嵐の夜、山奥のペンションに4人の客が閉じ込められる。一人、また一人と姿を消していく中、恐怖と疑心暗鬼が渦巻くホラー劇。",
      body: `【第一場】

嵐の夜。山奥のペンション「月影荘」のリビング。
暖炉の火が揺れている。外は暴風雨。

オーナーの声（録音）「本日は悪天候のため、オーナーは不在です。ごゆっくりお過ごしください」

客1・誠一（男・40歳）がソファに座り、本を読んでいる。
客2・奈緒（女・30歳）が窓の外を見ている。

奈緒「この嵐、いつまで続くんでしょう」
誠一「天気予報では明朝まで。携帯は圏外だし、ここに閉じ込められたな」

階段を降りてくる客3・拓也（男・25歳）。

拓也「あの、2階の廊下の突き当たりの部屋……鍵がかかってるんですけど」
誠一「使っていない部屋じゃないか？」
拓也「そうかもしれないけど……中から音がしたんです」
奈緒「音？」
拓也「何かを引きずるような……」

突然、照明が消える。闇。
誰かの悲鳴。

（暗転）`,
      durationMinutes: 40,
      castTotal: 4,
      castMale: 2,
      castFemale: 2,
      castOther: 0,
      feeAmount: 0,
      isFree: true,
      viewCount: 367,
      downloadCount: 31,
    },
    {
      authorId: "sample-author-1",
      title: "明日への手紙",
      synopsis:
        "余命宣告を受けた女性が、親友と妹に宛てた手紙を通じて、生きることの意味を問いかける。3人の女性の友情と絆を描くシリアスドラマ。",
      body: `【第一幕】

病室。白いベッドに横たわる真由美（女・32歳）。
窓から差し込む午後の光。

真由美はノートに何かを書いている。

真由美「（独白）手紙を書こうと思った。でも、何を書けばいいんだろう。『元気でね』？ 『ありがとう』？ そんな言葉じゃ、足りない」

ドアが開き、親友の京子（女・33歳）が花束を持って入ってくる。

京子「まーちゃん、来たよ。見て、向日葵。あなたの好きな」
真由美「ありがとう。……ねえ、京子」
京子「なに？」
真由美「私がいなくなったら、あの店どうする？」
京子「何言ってるの。いなくなるわけないでしょ」
真由美「京子」
京子「…………」

沈黙。京子の目に涙が浮かぶ。

真由美「泣かないで。私が泣けなくなるから」
京子「（涙を拭いて）泣いてない。花粉症」
真由美「（笑って）嘘つき」

（妹・美咲（女・25歳）の登場へ続く）`,
      durationMinutes: 50,
      castTotal: 3,
      castMale: 0,
      castFemale: 3,
      castOther: 0,
      feeAmount: 0,
      isFree: true,
      viewCount: 278,
      downloadCount: 22,
    },
  ];

  // Genre mapping: title -> genre slugs
  const genreMap: Record<string, string[]> = {
    "夏の終わりに": ["serious"],
    "笑門来福": ["comedy"],
    "星降る夜の物語": ["fantasy"],
    "東京バタフライ": ["serious"],
    "タイムカプセル": ["sf"],
    "春を待つ人々": ["musical"],
    "深夜のカフェで": ["comedy"],
    "鬼の涙": ["period", "serious"],
    "闇夜の訪問者": ["horror"],
    "明日への手紙": ["serious"],
  };

  // Fetch genre IDs
  const allGenres = await prisma.paletteGenre.findMany();
  const slugToGenreId: Record<string, number> = {};
  for (const g of allGenres) {
    slugToGenreId[g.slug] = g.id;
  }

  // Create plays
  const createdPlayIds: Record<string, string> = {};

  for (const p of plays) {
    const play = await prisma.palettePlay.create({
      data: {
        authorId: p.authorId,
        title: p.title,
        synopsis: p.synopsis,
        body: p.body,
        durationMinutes: p.durationMinutes,
        castTotal: p.castTotal,
        castMale: p.castMale,
        castFemale: p.castFemale,
        castOther: p.castOther,
        feeAmount: p.feeAmount,
        isFree: p.isFree,
        isPublished: true,
        viewCount: p.viewCount,
        downloadCount: p.downloadCount,
        publishedAt: new Date(
          now.getTime() - Math.floor(Math.random() * 30) * 86400000
        ),
      },
    });
    createdPlayIds[p.title] = play.id;
    console.log(`  作品作成: ${p.title} (${play.id})`);
  }

  // 3. ジャンル紐付け
  for (const [title, slugs] of Object.entries(genreMap)) {
    const playId = createdPlayIds[title];
    for (const slug of slugs) {
      const genreId = slugToGenreId[slug];
      if (playId && genreId) {
        await prisma.palettePlayGenre.create({
          data: { playId, genreId },
        });
      }
    }
  }
  console.log("ジャンル紐付け完了");

  // 4. レビュー（既存ユーザー + sample-author を相互レビュー）
  // レビュアーは作者以外のユーザーから選ぶ
  const reviewerIds = [
    "cmnxdmfgd00009hla7rbb768m", // 森ふみ
    "cmnxdohma00059hlam4gfi9t5", // 劇団かたかご
    "sample-author-1",
    "sample-author-2",
    "sample-author-3",
  ];

  const reviewData = [
    {
      title: "夏の終わりに",
      userId: "cmnxdmfgd00009hla7rbb768m",
      rating: 5,
      comment:
        "とても切なくて美しい作品です。大学最後の夏を思い出して泣きそうになりました。キャスト4人という少人数でこの深みを出せるのは見事。",
    },
    {
      title: "夏の終わりに",
      userId: "sample-author-2",
      rating: 4,
      comment:
        "青春ドラマとして完成度が高い。ラストの展開がもう少し意外性があると更に良くなると思います。",
    },
    {
      title: "笑門来福",
      userId: "sample-author-3",
      rating: 5,
      comment:
        "爆笑しました！ 商店街の人情味が素晴らしい。源蔵さんのキャラクターが最高です。上演したい！",
    },
    {
      title: "星降る夜の物語",
      userId: "cmnxdohma00059hlam4gfi9t5",
      rating: 4,
      comment:
        "ファンタジーとして壮大。照明演出との相性が良さそう。ただ90分の上演時間に対してキャスト8人は小劇場には少しハードルが高いかも。",
    },
    {
      title: "深夜のカフェで",
      userId: "cmnxdmfgd00009hla7rbb768m",
      rating: 5,
      comment:
        "20分でこの完成度！ 二人芝居の教科書のような作品。ワークショップ公演にもぴったり。",
    },
    {
      title: "深夜のカフェで",
      userId: "sample-author-3",
      rating: 4,
      comment: "会話のテンポが心地よい。深夜のカフェの空気感がよく出ている。",
    },
    {
      title: "鬼の涙",
      userId: "sample-author-1",
      rating: 5,
      comment:
        "時代劇の格調高さと、少女との交流の温かさのコントラストが素晴らしい。殺陣の演出も映えそう。",
    },
    {
      title: "闇夜の訪問者",
      userId: "cmnxdohma00059hlam4gfi9t5",
      rating: 3,
      comment:
        "ホラーとしての雰囲気作りは良い。ただ、もう少し伏線の回収が丁寧だと説得力が増すと思います。",
    },
  ];

  for (const r of reviewData) {
    const playId = createdPlayIds[r.title];
    if (playId) {
      await prisma.paletteReview.create({
        data: {
          playId,
          userId: r.userId,
          rating: r.rating,
          comment: r.comment,
        },
      });
      console.log(`  レビュー作成: ${r.title} by ${r.userId}`);
    }
  }
  console.log("レビュー投入完了");

  // 5. avg_rating, review_count を更新
  await prisma.$executeRaw`
    UPDATE palette.palette_plays SET
      avg_rating = COALESCE((SELECT AVG(rating)::float FROM palette.palette_reviews WHERE play_id = palette.palette_plays.id), 0),
      review_count = (SELECT COUNT(*) FROM palette.palette_reviews WHERE play_id = palette.palette_plays.id)
  `;
  console.log("avg_rating / review_count 更新完了");

  console.log("=== サンプルデータ投入完了 ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
