# Search Intent Analyzer

キーワード × エリアから、Gemini が検索ボリュームと検索ニーズを分析し、
キーワードマップ（マインドマップ型）を生成する SEO 分析ツールです。

- キーワード入力 → 全国 / ローカル選択 →（ローカル時）都道府県・市区町村を検索選択 → 「検索・分析」
- 検索意図（Know / Compare / Buy / Go）でクラスタ化した高密度キーワードマップ
- バブルのクリックで深掘り、詳細（推移・季節性・コンテンツ提案）表示
- マップを PNG で画像保存
- Gemini API キーは **サーバー側（API Route）** に格納し、ブラウザに露出させない構成

---

## 必要なもの

- Node.js 18.18 以上（推奨: 20 LTS）
- Gemini API キー（Google AI Studio: https://aistudio.google.com/app/apikey ）

---

## ローカルで動かす手順

```bash
# 1. 依存関係をインストール
npm install

# 2. 環境変数ファイルを作成（サンプルをコピー）
cp .env.local.example .env.local

# 3. .env.local を開き、GEMINI_API_KEY に自分のキーを貼る
#    例) GEMINI_API_KEY=AIzaSy........

# 4. 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:3000 を開くと使えます。

> `.env.local` は `.gitignore` 済みなので Git には上がりません（キーは安全です）。

---

## 仕組み（構成）

```
app/
  page.jsx              … 画面・キーワードマップ本体（クライアント）
  layout.jsx            … ルートレイアウト
  globals.css           … 最小グローバルCSS
  api/analyze/route.js  … Gemini を呼ぶサーバーAPI（キーはここでのみ使用）
```

- 画面側は `/api/analyze` に `{ seed, loc }` を POST するだけ。
- サーバー側（`route.js`）が `process.env.GEMINI_API_KEY` を使って Gemini を呼び、
  JSON（theme / clusters / keywords…）を返します。
- Gemini 接続に失敗した場合は、画面側で簡易な推定値マップにフォールバックします。

---

## GitHub にアップする手順

```bash
# プロジェクトフォルダ内で実行
git init
git add .
git commit -m "init: search intent analyzer"

# GitHub で空のリポジトリを作成してから（READMEなしで作成）、URLを指定
git branch -M main
git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
git push -u origin main
```

> `.env.local` はコミットされません。キーが GitHub に上がらないことを必ず確認してください。

---

## Vercel にデプロイ（任意・公開したい場合）

1. https://vercel.com にログインし「New Project」→ 上記の GitHub リポジトリを Import
2. 環境変数に `GEMINI_API_KEY`（必要なら `GEMINI_MODEL`）を設定
3. Deploy

---

## 注意

- 検索ボリュームは Gemini による **推定値** です（実測値ではありません）。
  実数が必要な場合は別途キーワードボリューム API の併用を検討してください。
- API キーは絶対にクライアントコードへ直書きしないでください（本構成はサーバー側で保持しています）。
