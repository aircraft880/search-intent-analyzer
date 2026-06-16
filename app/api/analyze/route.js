import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function parseJSON(t) {
  t = (t || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

function promptFor(seed, loc) {
  return `あなたは日本のSEO・検索行動の専門家。キーワード「${seed}」のGoogleサジェスト／関連キーワードを"網羅的に"洗い出し、キーワードマップ用データを作成する。
${loc ? `対象エリアは「${loc}」。地名を含むローカルサジェストや地域特有のニーズを多く含め、検索ボリュームも${loc}の市場規模に補正する。` : `対象は日本全国。`}
実際に検索されている候補を、以下のあらゆる切り口から可能な限り多く列挙すること（合計60個以上、できれば80個）:
- 疑問・情報(とは/なぜ/方法/やり方/初心者/仕組み 等)
- 悩み・ネガティブ(できない/失敗/後悔/難しい/デメリット 等)
- 比較・検討(比較/おすすめ/ランキング/口コミ/評判/違い 等)
- 購買(費用/料金/相場/安い/最安値/キャンペーン/無料 等)
- 指名・行動(公式/店舗/近く/予約/問い合わせ/ログイン 等)
- 関連サービス・派生語・複合キーワード(2〜3語の組み合わせ)
各キーワードに月間検索ボリューム(整数の推定)、検索意図(Know/Compare/Buy/Go)、中心KWとの関連度(0-100)を付ける。中心KWの月間検索ボリュームも推定。
クラスタは検索意図・テーマで6〜8個に分け、各クラスタに8〜14個のキーワードを入れる。実在しそうな自然な検索語のみ。
次のJSONのみ出力(前置き・マークダウン禁止):
{"theme":"${seed}","centerVolume":整数,"summary":"検索ニーズの要約(40字程度)",
 "clusters":[{"name":"クラスタ名","intent":"Know|Compare|Buy|Go","keywords":[{"keyword":"検索フレーズ","label":"短い表示名(2-7字)","volume":整数,"intent":"Know|Compare|Buy|Go","relevance":0-100}]}]}`;
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }); }
  const seed = (body?.seed || "").trim();
  const loc = body?.loc || null;
  if (!seed) return NextResponse.json({ error: "seed is required" }, { status: 400 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server" }, { status: 500 });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptFor(seed, loc) }] }],
        generationConfig: { temperature: 0.8, responseMimeType: "application/json" },
      }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return NextResponse.json({ error: `Gemini error ${r.status}`, detail }, { status: 502 });
    }
    const data = await r.json();
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text).join("");
    const parsed = parseJSON(text);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: "request failed", detail: String(e?.message || e) }, { status: 502 });
  }
}
