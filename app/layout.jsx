import "./globals.css";

export const metadata = {
  title: "Search Intent Analyzer",
  description: "キーワード × エリアで検索ニーズをマップ化するSEO分析ツール",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
