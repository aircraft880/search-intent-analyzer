"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import * as d3 from "d3";
import { LineChart, Line, XAxis, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import {
  Search, Download, TrendingUp, TrendingDown, Minus, Sparkles, Loader2, X,
  Maximize2, MapPin, Globe, Target, ChevronRight, ChevronDown,
} from "lucide-react";

/* ── 分析API（サーバー側の /api/analyze を呼ぶ。Geminiキーはサーバーに格納） ── */
const SOURCE = "Gemini";
async function fetchAnalyze(seed, loc) {
  const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed, loc }) });
  if (!res.ok) throw new Error("分析APIエラー (" + res.status + ")");
  return await res.json();
}

/* ── 検索意図 ───────────────────────────────────────────── */
const INTENT = {
  Know:    { label: "Know",    jp: "情報収集", color: "#5BC8F5" },
  Compare: { label: "Compare", jp: "比較検討", color: "#F6B24B" },
  Buy:     { label: "Buy",     jp: "購買",     color: "#36B37E" },
  Go:      { label: "Go",      jp: "指名移動", color: "#9B7BE0" },
};
const CLUSTERS = [
  { name: "情報収集", intent: "Know", mods: ["とは", "意味", "やり方", "方法", "初心者", "基本", "仕組み", "流れ", "種類", "一覧", "事例", "効果", "理由", "原因", "コツ", "手順", "始め方", "期間", "いつ", "どこ"] },
  { name: "悩み・疑問", intent: "Know", mods: ["なぜ", "できない", "わからない", "難しい", "失敗", "後悔", "トラブル", "リスク", "危険", "やめた", "続かない", "合わない", "意味ない", "大変", "デメリット", "注意点"] },
  { name: "比較検討", intent: "Compare", mods: ["比較", "おすすめ", "ランキング", "人気", "口コミ", "評判", "レビュー", "違い", "選び方", "どっち", "vs", "最新", "定番", "有名", "大手"] },
  { name: "購買", intent: "Buy", mods: ["費用", "料金", "価格", "相場", "安い", "最安値", "見積もり", "キャンペーン", "割引", "クーポン", "無料", "お試し", "申込", "予約", "購入", "通販"] },
  { name: "指名・行動", intent: "Go", mods: ["公式", "店舗", "近く", "営業時間", "予約", "問い合わせ", "資料請求", "ログイン", "アプリ", "会社", "業者", "専門店", "サイト"] },
  { name: "関連・サービス", intent: "Compare", mods: ["ツール", "ソフト", "代行", "サービス", "セミナー", "講座", "資格", "求人", "転職", "副業", "本", "動画", "youtube", "ai", "chatgpt"] },
];

/* ── 都道府県（人口で需要補正）＋ 主要市区町村 ───────────── */
const PREFS = [["北海道", 5.2], ["青森県", 1.24], ["岩手県", 1.21], ["宮城県", 2.30], ["秋田県", 0.96], ["山形県", 1.07], ["福島県", 1.83], ["茨城県", 2.87], ["栃木県", 1.93], ["群馬県", 1.94], ["埼玉県", 7.34], ["千葉県", 6.28], ["東京都", 14.0], ["神奈川県", 9.24], ["新潟県", 2.20], ["富山県", 1.03], ["石川県", 1.13], ["福井県", 0.77], ["山梨県", 0.81], ["長野県", 2.05], ["岐阜県", 1.98], ["静岡県", 3.63], ["愛知県", 7.55], ["三重県", 1.78], ["滋賀県", 1.41], ["京都府", 2.58], ["大阪府", 8.84], ["兵庫県", 5.47], ["奈良県", 1.32], ["和歌山県", 0.92], ["鳥取県", 0.55], ["島根県", 0.67], ["岡山県", 1.89], ["広島県", 2.80], ["山口県", 1.34], ["徳島県", 0.72], ["香川県", 0.95], ["愛媛県", 1.33], ["高知県", 0.69], ["福岡県", 5.14], ["佐賀県", 0.81], ["長崎県", 1.31], ["熊本県", 1.74], ["大分県", 1.12], ["宮崎県", 1.07], ["鹿児島県", 1.59], ["沖縄県", 1.47]];
const POP = Object.fromEntries(PREFS);
const shortPref = (n) => n.replace(/(都|府|県)$/, "");
const localScale = (n) => Math.max(0.04, (POP[n] || 1) / 125);
const CITIES = {
  "北海道": ["札幌市", "旭川市", "函館市", "釧路市", "帯広市", "小樽市", "苫小牧市"], "青森県": ["青森市", "八戸市", "弘前市", "十和田市"], "岩手県": ["盛岡市", "一関市", "奥州市", "花巻市"], "宮城県": ["仙台市", "石巻市", "大崎市", "名取市"], "秋田県": ["秋田市", "横手市", "大仙市"], "山形県": ["山形市", "鶴岡市", "酒田市", "米沢市"], "福島県": ["福島市", "郡山市", "いわき市", "会津若松市"], "茨城県": ["水戸市", "つくば市", "日立市", "土浦市", "ひたちなか市"], "栃木県": ["宇都宮市", "小山市", "栃木市", "足利市"], "群馬県": ["前橋市", "高崎市", "太田市", "伊勢崎市"], "埼玉県": ["さいたま市", "川口市", "川越市", "所沢市", "越谷市", "熊谷市"], "千葉県": ["千葉市", "船橋市", "松戸市", "柏市", "市川市", "浦安市"], "東京都": ["新宿区", "渋谷区", "世田谷区", "港区", "中央区", "千代田区", "八王子市", "町田市", "立川市", "武蔵野市"], "神奈川県": ["横浜市", "川崎市", "相模原市", "藤沢市", "横須賀市", "鎌倉市", "厚木市"], "新潟県": ["新潟市", "長岡市", "上越市"], "富山県": ["富山市", "高岡市"], "石川県": ["金沢市", "白山市", "小松市"], "福井県": ["福井市", "敦賀市"], "山梨県": ["甲府市", "富士吉田市"], "長野県": ["長野市", "松本市", "上田市", "飯田市"], "岐阜県": ["岐阜市", "大垣市", "各務原市", "高山市"], "静岡県": ["静岡市", "浜松市", "沼津市", "富士市", "藤枝市"], "愛知県": ["名古屋市", "豊田市", "岡崎市", "一宮市", "豊橋市", "春日井市"], "三重県": ["津市", "四日市市", "鈴鹿市", "松阪市"], "滋賀県": ["大津市", "草津市", "彦根市"], "京都府": ["京都市", "宇治市", "亀岡市", "長岡京市"], "大阪府": ["大阪市", "堺市", "東大阪市", "豊中市", "吹田市", "枚方市", "高槻市"], "兵庫県": ["神戸市", "姫路市", "西宮市", "尼崎市", "明石市", "加古川市"], "奈良県": ["奈良市", "橿原市", "生駒市"], "和歌山県": ["和歌山市", "田辺市"], "鳥取県": ["鳥取市", "米子市"], "島根県": ["松江市", "出雲市"], "岡山県": ["岡山市", "倉敷市", "津山市"], "広島県": ["広島市", "福山市", "呉市", "東広島市"], "山口県": ["山口市", "下関市", "周南市", "宇部市"], "徳島県": ["徳島市", "鳴門市"], "香川県": ["高松市", "丸亀市"], "愛媛県": ["松山市", "今治市", "新居浜市"], "高知県": ["高知市", "南国市"], "福岡県": ["福岡市", "北九州市", "久留米市", "飯塚市"], "佐賀県": ["佐賀市", "唐津市"], "長崎県": ["長崎市", "佐世保市", "諫早市"], "熊本県": ["熊本市", "八代市", "天草市"], "大分県": ["大分市", "別府市"], "宮崎県": ["宮崎市", "都城市", "延岡市"], "鹿児島県": ["鹿児島市", "霧島市", "鹿屋市"], "沖縄県": ["那覇市", "沖縄市", "うるま市", "浦添市"],
};
const LOC_SUGGEST = [];
PREFS.forEach(([p]) => { LOC_SUGGEST.push({ pref: p, city: null, label: p }); (CITIES[p] || []).forEach(c => LOC_SUGGEST.push({ pref: p, city: c, label: `${p} ${c}` })); });

/* ── ユーティリティ ─────────────────────────────────────── */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const fmt = (n) => Number(n).toLocaleString();
const monthName = (m) => `${m + 1}月`;
const trunc = (s, n) => (s && s.length > n ? s.slice(0, n) + "…" : (s || ""));
let _id = 0; const nid = () => "k" + (_id++);
function shade(hex, t) { let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); const f = (v) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t)); return `#${[f(r), f(g), f(b)].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`; }

/* ── 推定フォールバック（AI不可時） ─────────────────────── */
function estimateData(seed, prefName, city) {
  const loc = city || (prefName ? shortPref(prefName) : "");
  const h = hashStr(seed + (loc || "")), rand = rng(h);
  const sc = prefName ? localScale(prefName) * (city ? 0.4 : 1) : 1;
  const base = 800 + (h % 9) * 700;
  return {
    theme: seed, centerVolume: Math.round(base * 16 * sc * (0.7 + rand() * 0.6)),
    summary: `${seed}${loc ? `（${loc}）` : ""}の検索ニーズ（推定）`,
    clusters: CLUSTERS.map(c => ({
      name: c.name, intent: c.intent,
      keywords: [...c.mods].sort(() => rand() - 0.5).slice(0, 9 + Math.floor(rand() * 5)).map((m, i) => ({
        keyword: `${seed}${loc ? " " + loc : ""} ${m}`, label: m,
        volume: Math.max(8, Math.round(base * sc * (1.5 - i * 0.08) * (0.4 + rand()))),
        intent: c.intent, relevance: 55 + Math.floor(rand() * 44),
      })),
    })),
  };
}
function genChildren(parent) {
  const h = hashStr(parent.keyword + "x"), rand = rng(h);
  const mods = ["とは", "方法", "比較", "おすすめ", "料金", "口コミ", "無料", "事例"];
  const base = Math.max(20, parent.volume * 0.35);
  return [...mods].sort(() => rand() - 0.5).slice(0, 4 + Math.floor(rand() * 3)).map(m => {
    const kw = `${parent.keyword} ${m}`;
    return { id: nid(), keyword: kw, label: m, volume: Math.max(5, Math.round(base * (0.4 + rand()))), color: shade(INTENT[parent.intent].color, (hashStr(kw) % 50) / 100 - 0.2), intent: parent.intent, relevance: 50 + Math.floor(rand() * 45), level: parent.level + 1, parentId: parent.id, expanded: false, tx: parent.x, ty: parent.y };
  });
}

/* ── 詳細パネル用：24ヶ月推移 ─────────────────────────── */
function monthAxis(n = 24) { const a = []; const now = new Date(); for (let i = n - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); a.push({ label: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`, moy: d.getMonth() }); } return a; }
function phraseSeries(phrase, volume) {
  const h = hashStr(phrase), rand = rng(h);
  const peak = h % 12, amp = 0.3 + (h % 5) * 0.1, drift = ((h % 7) - 3) * 0.01;
  const vals = monthAxis(24).map((a, i) => { const season = 1 + amp * Math.cos((2 * Math.PI * (a.moy - peak)) / 12); return { label: a.label, v: Math.max(5, Math.round((volume / 1.5) * season * (1 + drift * i) * (0.92 + rand() * 0.16))), moy: a.moy }; });
  const last = vals[23].v, prev = vals[22].v, ya = vals[11].v;
  const mom = prev > 0 ? (last - prev) / prev : 0, yoy = ya > 0 ? (last - ya) / ya : 0;
  const byMoy = {}; vals.forEach(v => (byMoy[v.moy] = byMoy[v.moy] || []).push(v.v));
  const avg = Object.entries(byMoy).map(([m, x]) => ({ moy: +m, avg: x.reduce((a, b) => a + b, 0) / x.length })).sort((a, b) => b.avg - a.avg);
  const yv = yoy || mom, trend = yv >= 0.2 || mom >= 0.25 ? "急上昇" : yv <= -0.2 || mom <= -0.25 ? "急下降" : "安定";
  return { vals, mom, yoy, trend, peakMonth: avg[0].moy, lowMonth: avg[avg.length - 1].moy };
}
const CONTENT = {
  Know: { type: "ハウツー記事 / 用語解説", outline: ["定義と前提の説明", "具体的な手順・方法", "つまずきポイントの解消", "関連トピックへの導線"] },
  Compare: { type: "比較記事 / ランキング", outline: ["選び方の評価軸", "主要候補の比較表", "目的別おすすめ", "失敗しない注意点"] },
  Buy: { type: "LP / レビュー", outline: ["価格・プランの明示", "導入メリットと実績", "申込手順・特典", "FAQと不安の解消"] },
  Go: { type: "公式導線 / 操作ガイド", outline: ["公式ページへの導線", "操作・問い合わせ手順", "店舗・拠点情報", "関連サービス案内"] },
};

/* ── レイアウト（ラベル幅を考慮した衝突 → 重なり防止） ──── */
const VB_W = 1560, VB_H = 1060;
function footprint(n) {
  const fs = n.isRoot ? 15 : n.isHub ? 13 : 12;
  const lw = (n.displayLabel || "").length * fs * 0.92;     // ラベルの推定幅
  return Math.max(n.r, lw / 2) + 12;                          // 半径 + 余白
}
function runLayout(nodes, links) {
  const leaf = nodes.filter(n => n.level >= 2), lv = leaf.map(n => n.volume);
  const rScale = d3.scaleSqrt().domain([Math.max(1, d3.min(lv) || 1), Math.max(2, d3.max(lv) || 2)]).range([16, 52]);
  const hubs = nodes.filter(n => n.isHub), hv = hubs.map(n => n.volume);
  const hScale = d3.scaleSqrt().domain([Math.max(1, d3.min(hv) || 1), Math.max(2, d3.max(hv) || 2)]).range([30, 44]);
  nodes.forEach(n => { n.r = n.isRoot ? 60 : n.isHub ? hScale(n.volume) : rScale(n.volume); n.x = n.x ?? n.tx ?? VB_W / 2; n.y = n.y ?? n.ty ?? VB_H / 2; });
  const root = nodes.find(n => n.isRoot); if (root) { root.fx = VB_W / 2; root.fy = VB_H / 2; }
  const linkObjs = links.map(l => ({ source: l.s, target: l.t, kind: l.kind }));
  d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(d => d.isHub ? -520 : -170))
    .force("link", d3.forceLink(linkObjs).id(d => d.id).distance(d => d.kind === "rh" ? 300 : (d.source.r || 20) + (d.target.r || 14) + 48).strength(d => d.kind === "rh" ? 0.45 : 0.22))
    .force("collide", d3.forceCollide().radius(footprint).strength(1).iterations(5))
    .force("x", d3.forceX(d => d.tx ?? VB_W / 2).strength(d => d.isHub ? 0.32 : d.level >= 2 ? 0.045 : 0))
    .force("y", d3.forceY(d => d.ty ?? VB_H / 2).strength(d => d.isHub ? 0.32 : d.level >= 2 ? 0.045 : 0))
    .stop().tick(480);
  return nodes;
}
function buildGraph(data, prefName, city) {
  _id = 0;
  const clusters = (data.clusters || []).filter(c => c && c.keywords && c.keywords.length).slice(0, 8);
  const N = Math.max(1, clusters.length);
  const rootId = nid();
  const total = clusters.reduce((a, c) => a + c.keywords.reduce((x, k) => x + (+k.volume || 0), 0), 0);
  const rootLabel = trunc(data.theme || "テーマ", 12);
  const nodes = [{ id: rootId, keyword: data.theme || "テーマ", label: data.theme, displayLabel: rootLabel, volume: Math.max(100, Math.round(+data.centerVolume) || total), color: "#4A90D9", intent: "Know", level: 0, isRoot: true, expanded: true, tx: VB_W / 2, ty: VB_H / 2, x: VB_W / 2, y: VB_H / 2 }];
  const links = [];
  clusters.forEach((c, i) => {
    const ang = -Math.PI / 2 + (i / N) * 2 * Math.PI;
    const hx = VB_W / 2 + Math.cos(ang) * 360, hy = VB_H / 2 + Math.sin(ang) * 360;
    const intent = INTENT[c.intent] ? c.intent : "Know";
    const csum = c.keywords.reduce((x, k) => x + (+k.volume || 0), 0);
    const hubId = nid();
    nodes.push({ id: hubId, keyword: c.name || INTENT[intent].jp, label: c.name, displayLabel: trunc(c.name || INTENT[intent].jp, 7), volume: Math.max(50, csum), color: INTENT[intent].color, intent, level: 1, isHub: true, parentId: rootId, expanded: true, tx: hx, ty: hy, x: hx, y: hy });
    links.push({ s: rootId, t: hubId, kind: "rh" });
    c.keywords.slice(0, 16).forEach(k => {
      const it = INTENT[k.intent] ? k.intent : intent;
      const id = nid();
      nodes.push({ id, keyword: k.keyword, label: k.label || k.keyword, displayLabel: trunc(k.label || k.keyword, 8), volume: Math.max(1, Math.round(+k.volume) || 0), color: shade(INTENT[it].color, (hashStr(k.keyword) % 50) / 100 - 0.2), intent: it, relevance: Math.max(0, Math.min(100, Math.round(+k.relevance) || 70)), level: 2, parentId: hubId, expanded: false, tx: hx, ty: hy, x: hx + (Math.random() - .5) * 80, y: hy + (Math.random() - .5) * 80 });
      links.push({ s: hubId, t: id, kind: "hl" });
    });
  });
  runLayout(nodes, links);
  return { nodes, links, theme: data.theme, summary: data.summary, prefName, city };
}
function textOn(hex) { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? "#2a3b3d" : "#ffffff"; }
function linkPath(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1, ux = dx / dist, uy = dy / dist;
  const sx = a.x + ux * (a.r + 1), sy = a.y + uy * (a.r + 1), ex = b.x - ux * (b.r + 7), ey = b.y - uy * (b.r + 7);
  const mx = (sx + ex) / 2, my = (sy + ey) / 2, nx = -(ey - sy), ny = (ex - sx), nl = Math.hypot(nx, ny) || 1, bend = dist * 0.12;
  return `M${sx},${sy} Q${mx + nx / nl * bend},${my + ny / nl * bend} ${ex},${ey}`;
}
function bounds(nodes) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach(n => { minX = Math.min(minX, n.x - n.r - 40); maxX = Math.max(maxX, n.x + n.r + 40); minY = Math.min(minY, n.y - n.r - 16); maxY = Math.max(maxY, n.y + n.r + 30); });
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}

/* ── グラフキャンバス ───────────────────────────────────── */
function Canvas({ graph, onExpand, selectedId, fitKey }) {
  const svgRef = useRef(null), zoomRef = useRef(null);
  const [tf, setTf] = useState({ x: 0, y: 0, k: 1 });
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const sel = d3.select(svgRef.current);
    const zoom = d3.zoom().scaleExtent([0.15, 2.6]).on("zoom", (e) => setTf({ x: e.transform.x, y: e.transform.y, k: e.transform.k }));
    zoomRef.current = zoom; sel.call(zoom).on("dblclick.zoom", null);
    return () => { sel.on(".zoom", null); };
  }, []);
  const fit = useCallback(() => {
    const b = bounds(graph.nodes);
    const k = Math.max(0.15, Math.min(1.3, Math.min((VB_W - 40) / b.w, (VB_H - 40) / b.h)));
    const cx = b.minX + b.w / 2, cy = b.minY + b.h / 2;
    const t = d3.zoomIdentity.translate(VB_W / 2 - cx * k, VB_H / 2 - cy * k).scale(k);
    d3.select(svgRef.current).call(zoomRef.current.transform, t);
  }, [graph]);
  useEffect(() => { fit(); /* 新規分析時に全体フィット */ }, [fitKey]); // eslint-disable-line
  const byId = useMemo(() => Object.fromEntries(graph.nodes.map(n => [n.id, n])), [graph]);
  const hoverNode = hover && byId[hover];

  const saveImage = () => {
    const svg = svgRef.current; if (!svg) return;
    const b = bounds(graph.nodes), scale = 2;
    const clone = svg.cloneNode(true);
    clone.setAttribute("viewBox", `${b.minX} ${b.minY} ${b.w} ${b.h}`);
    clone.setAttribute("width", b.w * scale); clone.setAttribute("height", b.h * scale);
    clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const inner = clone.querySelector("g"); if (inner) inner.setAttribute("transform", "translate(0,0) scale(1)");
    const NS = "http://www.w3.org/2000/svg";
    const bg = document.createElementNS(NS, "rect");
    bg.setAttribute("x", b.minX); bg.setAttribute("y", b.minY); bg.setAttribute("width", b.w); bg.setAttribute("height", b.h); bg.setAttribute("fill", "#ffffff");
    clone.insertBefore(bg, clone.firstChild);
    const st = document.createElementNS(NS, "style");
    st.textContent = "text{font-family:'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;}";
    clone.insertBefore(st, clone.firstChild);
    const xml = new XMLSerializer().serializeToString(clone);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas"); cv.width = b.w * scale; cv.height = b.h * scale;
      const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob((blob) => { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = `keyword-map-${graph.theme || "map"}.png`; a.click(); URL.revokeObjectURL(u); });
    };
    img.src = url;
  };

  return (
    <div className="kn-canvas">
      <div className="kn-tools">
        <button onClick={saveImage} title="画像を保存(PNG)"><Download size={15} /></button>
        <button onClick={fit} title="全体表示"><Maximize2 size={15} /></button>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${VB_H}`} className="kn-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L7,3 L0,6 Z" fill="#A9CFEC" /></marker>
          <radialGradient id="rootG" cx="42%" cy="36%" r="70%"><stop offset="0%" stopColor="#5FA8E8" /><stop offset="100%" stopColor="#2C6FC4" /></radialGradient>
        </defs>
        <g transform={`translate(${tf.x},${tf.y}) scale(${tf.k})`}>
          <g>
            {graph.links.map((l, i) => {
              const a = byId[l.s], b = byId[l.t]; if (!a || !b) return null;
              const active = hover === b.id || hover === a.id || selectedId === b.id;
              const w = l.kind === "rh" ? 3 : Math.max(1.4, Math.min(5, b.volume / 1600 + 1.4));
              return <path key={i} d={linkPath(a, b)} fill="none" markerEnd="url(#arrow)" pathLength="1" className="kn-link" style={{ animationDelay: Math.min(i * 8, 450) + "ms" }} stroke={active ? "#6FB4E6" : l.kind === "rh" ? "#9FC4E6" : "#C4DCF0"} strokeWidth={active ? w + 0.8 : w} strokeOpacity={active ? 0.95 : 0.6} strokeLinecap="round" />;
            })}
          </g>
          <g>
            {graph.nodes.map((n, i) => {
              const tcol = n.isRoot ? "#fff" : textOn(n.color);
              const active = hover === n.id || selectedId === n.id;
              const digits = fmt(n.volume).length;
              const numFs = Math.max(8, Math.min(n.isRoot ? 19 : 14, (n.r * 1.7) / (digits * 0.6)));
              const op = n.isRoot || n.isHub ? 1 : 0.6 + (n.relevance || 70) / 250;
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`} className="kn-node" style={{ animationDelay: Math.min(i * 10, 520) + "ms", cursor: "pointer" }}
                  onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(h => h === n.id ? null : h)} onClick={(e) => { e.stopPropagation(); onExpand(n); }}>
                  <circle r={n.r + (active ? 3 : 0)} fill={n.isRoot ? "url(#rootG)" : n.color} fillOpacity={op} stroke={active ? "#2a3b3d" : "rgba(255,255,255,0.92)"} strokeWidth={active ? 2 : n.isHub ? 2 : 1.5} style={{ filter: "drop-shadow(0 2px 5px rgba(40,70,90,0.18))" }} className="kn-circle" />
                  <ellipse cx="0" cy={-n.r * 0.34} rx={n.r * 0.6} ry={n.r * 0.38} fill="#fff" opacity="0.16" pointerEvents="none" />
                  {!n.isHub && <text textAnchor="middle" dy={numFs * 0.34} style={{ fontSize: numFs, fill: tcol, fontWeight: 700, fontFamily: "var(--mono)", paintOrder: "stroke", stroke: tcol === "#ffffff" ? "rgba(0,0,0,0.18)" : "none", strokeWidth: 2.4 }}>{fmt(n.volume)}</text>}
                  <text textAnchor="middle" y={n.r + 16} style={{ fontSize: n.isRoot ? 15 : n.isHub ? 13.5 : 12, fill: n.isHub ? INTENT[n.intent].color : "#33484b", fontWeight: n.isRoot || n.isHub ? 700 : 600, fontFamily: "'Noto Sans JP',sans-serif", paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 3.2 }}>{n.displayLabel}</text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      <div className="kn-legend2">{Object.values(INTENT).map(it => <span key={it.label}><i style={{ background: it.color }} />{it.label} <em>{it.jp}</em></span>)}</div>
      {hoverNode && (
        <div className="kn-tip">
          <div className="kn-tip-kw">{hoverNode.keyword}</div>
          <div className="kn-tip-vol">{hoverNode.isHub ? "合計 " : "検索数 "}<strong>{fmt(hoverNode.volume)}</strong>{!hoverNode.isRoot && !hoverNode.isHub && <span className="kn-tip-int" style={{ color: INTENT[hoverNode.intent].color }}>· {INTENT[hoverNode.intent].label} · 関連度{hoverNode.relevance}</span>}</div>
          {!hoverNode.expanded && !hoverNode.isHub && !hoverNode.isRoot && <div className="kn-tip-hint">クリックで深掘り</div>}
        </div>
      )}
    </div>
  );
}

/* ── 詳細パネル ───────────────────────────────────────── */
function Detail({ node, onClose, onRecenter }) {
  if (!node || node.isHub || node.isRoot) return null;
  const it = INTENT[node.intent];
  const s = useMemo(() => phraseSeries(node.keyword, node.volume), [node.keyword, node.volume]);
  const c = CONTENT[node.intent];
  const trendC = s.trend === "急上昇" ? "#36B37E" : s.trend === "急下降" ? "#E8685E" : "#8AA1A3";
  const TI = s.trend === "急上昇" ? TrendingUp : s.trend === "急下降" ? TrendingDown : Minus;
  return (
    <div className="kn-detail">
      <div className="kn-detail-head">
        <div>
          <div className="kn-detail-kw">{node.keyword}</div>
          <div className="kn-detail-meta">
            <span className="kn-badge" style={{ color: it.color, borderColor: it.color }}><span className="kn-dot" style={{ background: it.color }} />{it.label} <span style={{ opacity: .6 }}>{it.jp}</span></span>
            <span className="kn-vol-chip">検索数 <strong style={{ fontFamily: "var(--mono)", color: it.color }}>{fmt(node.volume)}</strong></span>
            <span className="kn-trend" style={{ color: trendC, borderColor: trendC }}><TI size={13} />{s.trend}</span>
            <span className="kn-rel">関連度 <strong>{node.relevance}</strong></span>
          </div>
        </div>
        <button className="kn-x" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="kn-detail-grid">
        <div>
          <div className="kn-sub">月別検索ボリューム推移（推定）</div>
          <ResponsiveContainer width="100%" height={118}>
            <LineChart data={s.vals} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <Line type="monotone" dataKey="v" stroke={it.color} strokeWidth={2} dot={false} isAnimationActive animationDuration={600} />
              <XAxis dataKey="label" tick={{ fill: "#7A8A91", fontSize: 10, fontFamily: "var(--mono)" }} interval={5} axisLine={{ stroke: "#D8E0E6" }} tickLine={false} />
              <RTooltip contentStyle={{ background: "#ffffff", border: "1px solid #E3EAF0", borderRadius: 8, fontSize: 11, boxShadow: "0 4px 14px rgba(40,70,90,.12)" }} labelStyle={{ color: "#5B6B73" }} formatter={(v) => [fmt(v), "推定ボリューム"]} />
            </LineChart>
          </ResponsiveContainer>
          <div className="kn-season">
            <span className="kn-stag" style={{ color: "#2E9E6E", borderColor: "#BBE3D0" }}>ピーク {monthName(s.peakMonth)}</span>
            <span className="kn-stag" style={{ color: "#5B6B73", borderColor: "#DCE4EA" }}>閑散 {monthName(s.lowMonth)}</span>
            <span className="kn-stag" style={{ color: s.mom >= 0 ? "#2E9E6E" : "#E8685E", borderColor: "#DCE4EA" }}>前月比 {(s.mom * 100).toFixed(1)}%</span>
          </div>
        </div>
        <div>
          <div className="kn-sub"><Sparkles size={12} style={{ color: it.color }} /> コンテンツ提案</div>
          <div className="kn-ctype">推奨: <strong style={{ color: it.color }}>{c.type}</strong></div>
          <ul className="kn-outline">{c.outline.map((o, i) => <li key={i}>{o}</li>)}</ul>
        </div>
      </div>
      <button className="kn-recenter" onClick={() => onRecenter(node.keyword)}><Target size={14} />「{node.keyword}」で再分析<ChevronRight size={14} /></button>
    </div>
  );
}

/* ── 位置検索コンボボックス ─────────────────────────────── */
function LocationPicker({ value, onChange }) {
  const [q, setQ] = useState(value ? value.label : "");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useEffect(() => { const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const results = useMemo(() => {
    const s = q.trim();
    if (!s) return LOC_SUGGEST.filter(x => !x.city).slice(0, 47);
    return LOC_SUGGEST.filter(x => x.label.includes(s) || shortPref(x.pref).includes(s)).slice(0, 30);
  }, [q]);
  return (
    <div className="sia-loc" ref={boxRef}>
      <MapPin size={15} style={{ color: "#6E8487" }} />
      <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); onChange(null); }} onFocus={() => setOpen(true)} placeholder="都道府県・市区町村を検索（例: 横浜 / 大阪市）" />
      <ChevronDown size={15} style={{ color: "#6E8487" }} />
      {open && (
        <div className="sia-loc-list">
          {results.length === 0 && <div className="sia-loc-empty">該当なし</div>}
          {results.map((r, i) => (
            <button key={i} className="sia-loc-item" onClick={() => { onChange(r); setQ(r.label); setOpen(false); }}>
              {r.city ? <><span className="sia-loc-city">{r.city}</span><span className="sia-loc-pref">{r.pref}</span></> : <span className="sia-loc-prefonly">{r.pref}<em>全域</em></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── メイン ───────────────────────────────────────────── */
export default function App() {
  const [seed, setSeed] = useState("");
  const [scope, setScope] = useState("national");
  const [loc, setLoc] = useState(null); // {pref, city, label}
  const [graph, setGraph] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ver, setVer] = useState(0);

  const analyze = useCallback(async (sdOverride) => {
    const k = (sdOverride ?? seed).trim();
    if (!k) { setErr("キーワードを入力してください"); return; }
    if (scope === "local" && !loc) { setErr("都道府県・市区町村を選択してください"); return; }
    setErr(""); setSelected(null); setBusy(true);
    const locLabel = scope === "local" && loc ? loc.label : null;
    const prefName = scope === "local" && loc ? loc.pref : null;
    const city = scope === "local" && loc ? loc.city : null;
    let data, source = SOURCE;
    try { data = await fetchAnalyze(k, locLabel); }
    catch (e) { setErr("AI接続不可のため推定値で表示しています"); data = estimateData(k, prefName, city); source = "推定値"; }
    const g = buildGraph(data, prefName, city); g.source = source; g.locLabel = locLabel;
    setGraph(g); setVer(v => v + 1); setBusy(false);
  }, [seed, scope, loc]);

  const expand = useCallback((node) => {
    if (node.isHub || node.isRoot) { setSelected(null); return; }
    setSelected(node);
    setGraph((g) => {
      if (!g) return g;
      const target = g.nodes.find(n => n.id === node.id);
      if (!target || target.expanded || g.nodes.length > 240) return g;
      const kids = genChildren(target);
      kids.forEach(c => { c.displayLabel = trunc(c.label, 8); c.x = target.x + (Math.random() - .5) * 50; c.y = target.y + (Math.random() - .5) * 50; });
      const nodes = g.nodes.map(n => n.id === target.id ? { ...n, expanded: true } : n).concat(kids);
      const links = g.links.concat(kids.map(c => ({ s: target.id, t: c.id, kind: "hl" })));
      runLayout(nodes, links);
      return { ...g, nodes, links };
    });
  }, []);

  const total = graph ? graph.nodes.filter(n => n.level >= 2).reduce((a, b) => a + b.volume, 0) : 0;

  return (
    <div className="sia-root">
      <style>{CSS}</style>
      <header className="sia-header">
        <div className="sia-brand">
          <div className="sia-logo"><Search size={18} strokeWidth={2.2} /></div>
          <div>
            <h1>Search Intent Analyzer</h1>
            <p>キーワード × エリアで、検索ニーズをマップ化する。</p>
          </div>
        </div>
        <div className="sia-legend">
          <span className="sia-legend-item">○ 大きさ = 検索ボリューム</span>
          <span className="sia-legend-item">濃さ = 関連度</span>
          <span className="sia-legend-item" style={{ marginLeft: "auto" }}>AI: {SOURCE}</span>
        </div>
      </header>

      <section className="sia-panel">
        <div className="sia-eyebrow">① キーワード</div>
        <div className="sia-search"><Search size={16} style={{ color: "#6E8487" }} /><input value={seed} onChange={e => setSeed(e.target.value)} placeholder="例: 注文住宅 / 脱毛 / 税理士 / SEO" /></div>

        <div className="sia-eyebrow" style={{ marginTop: 16 }}>② 対象範囲</div>
        <div className="sia-seg">
          <button className={scope === "national" ? "on" : ""} onClick={() => { setScope("national"); setErr(""); }}><Globe size={14} />全国</button>
          <button className={scope === "local" ? "on" : ""} onClick={() => { setScope("local"); setErr(""); }}><MapPin size={14} />ローカル</button>
        </div>

        {scope === "local" && (<>
          <div className="sia-eyebrow" style={{ marginTop: 16 }}>③ エリア（都道府県・市区町村）</div>
          <LocationPicker value={loc} onChange={setLoc} />
        </>)}

        <div className="sia-controls">
          <button className="sia-primary" onClick={() => analyze()} disabled={busy}>{busy ? <><Loader2 size={15} className="sia-spin" />分析中…</> : <><Sparkles size={15} />④ 検索・分析</>}</button>
          {err && <span className="sia-errline"><X size={13} />{err}</span>}
        </div>
      </section>

      {!graph && <div className="sia-empty"><Search size={22} style={{ opacity: .4 }} /><p>キーワードを入力し、全国／ローカルを選んで「検索・分析」。AIが検索ボリュームと検索ニーズを分析してキーワードマップを作成します。</p></div>}

      {graph && (
        <section className="sia-graphpanel">
          <div className="sia-graph-head">
            <div>
              <div className="sia-eyebrow">KEYWORD MAP — {graph.theme}</div>
              {graph.summary && <div className="sia-summary">{graph.summary}</div>}
            </div>
            <div className="sia-graph-stat">
              <span className={"sia-scopepill " + (graph.locLabel ? "local" : "national")}>{graph.locLabel ? <><MapPin size={12} />{graph.locLabel}</> : <><Globe size={12} />全国</>}</span>
              <span>KW <strong>{graph.nodes.filter(n => n.level >= 2).length}</strong></span>
              <span>総検索数 <strong style={{ fontFamily: "var(--mono)", color: "#36B37E" }}>{fmt(total)}</strong></span>
              <span className="kn-src">{graph.source}</span>
            </div>
          </div>
          <Canvas graph={graph} onExpand={expand} selectedId={selected?.id} fitKey={ver} />
          {selected ? <Detail node={selected} onClose={() => setSelected(null)} onRecenter={(kw) => { setSeed(kw); analyze(kw); }} /> : <p className="sia-graphhint">中央＝KW、放射の節＝検索意図、先のバブル＝関連キーワード（数字＝月間検索数）。クリックで深掘り＋詳細。右上から画像保存できます。</p>}
        </section>
      )}

      <footer className="sia-foot">Search Intent Analyzer · 検索ボリューム・検索ニーズは{SOURCE}による推定</footer>
    </div>
  );
}

/* ── スタイル ─────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@500;600&family=Noto+Sans+JP:wght@400;500;700&display=swap');
.sia-root{--bg:#F2F6FA;--panel:#FFFFFF;--panel2:#F8FBFD;--line:#E3EAF0;--text:#1F2B31;--muted:#5B6B73;--dim:#8B98A0;--accent:#36B37E;--mono:'JetBrains Mono',monospace;--disp:'Space Grotesk',sans-serif;font-family:'Noto Sans JP',system-ui,sans-serif;background:radial-gradient(1200px 460px at 50% -160px,rgba(74,144,217,0.10),transparent 70%),var(--bg);color:var(--text);min-height:100vh;padding:22px;max-width:1200px;margin:0 auto;box-sizing:border-box;}
.sia-root *{box-sizing:border-box;}
.sia-header{padding:22px 26px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(180deg,#FFFFFF,#F6FAFD);box-shadow:0 1px 3px rgba(40,70,90,.05);margin-bottom:18px;}
.sia-brand{display:flex;gap:14px;align-items:center;}
.sia-logo{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:rgba(74,144,217,0.12);border:1px solid #cfe0f0;color:#2C6FC4;flex:none;}
.sia-header h1{font-family:var(--disp);font-size:23px;font-weight:700;margin:0;letter-spacing:-0.01em;color:#16242b;}
.sia-header p{margin:3px 0 0;color:var(--muted);font-size:13px;}
.sia-legend{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px;align-items:center;}
.sia-legend-item{font-family:var(--mono);font-size:11.5px;color:var(--muted);}
.sia-panel{border:1px solid var(--line);border-radius:14px;background:var(--panel);box-shadow:0 1px 3px rgba(40,70,90,.05);padding:16px 20px 18px;margin-bottom:18px;}
.sia-eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.12em;color:var(--dim);text-transform:uppercase;margin-bottom:10px;}
.sia-search{display:flex;align-items:center;gap:10px;background:#F6F9FC;border:1px solid var(--line);border-radius:10px;padding:0 14px;}
.sia-search:focus-within{border-color:#9DC2E8;box-shadow:0 0 0 3px rgba(74,144,217,0.12);background:#fff;}
.sia-search input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:15px;padding:13px 0;font-family:'Noto Sans JP',sans-serif;}
.sia-search input::placeholder{color:#A3B0B7;}
.sia-seg{display:inline-flex;background:#EEF3F8;border:1px solid var(--line);border-radius:9px;padding:3px;gap:3px;}
.sia-seg button{display:inline-flex;align-items:center;gap:6px;background:transparent;border:none;color:var(--muted);border-radius:7px;padding:9px 18px;font-size:13px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;transition:.12s;}
.sia-seg button.on{background:#4A90D9;color:#fff;font-weight:600;box-shadow:0 1px 3px rgba(74,144,217,.3);}
.sia-loc{position:relative;display:flex;align-items:center;gap:10px;background:#F6F9FC;border:1px solid var(--line);border-radius:10px;padding:0 14px;}
.sia-loc:focus-within{border-color:#9DC2E8;box-shadow:0 0 0 3px rgba(74,144,217,0.12);background:#fff;}
.sia-loc input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:14px;padding:12px 0;font-family:'Noto Sans JP',sans-serif;}
.sia-loc input::placeholder{color:#A3B0B7;}
.sia-loc-list{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:20;max-height:260px;overflow:auto;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 12px 30px rgba(40,70,90,.16);padding:5px;}
.sia-loc-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;border:none;color:var(--text);padding:9px 11px;border-radius:7px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;font-size:13.5px;}
.sia-loc-item:hover{background:#EAF2FB;}
.sia-loc-city{font-weight:600;}
.sia-loc-pref{color:var(--dim);font-size:12px;}
.sia-loc-prefonly{font-weight:600;}
.sia-loc-prefonly em{font-style:normal;color:var(--dim);font-size:12px;margin-left:6px;}
.sia-loc-empty{padding:12px;color:var(--dim);font-size:13px;text-align:center;}
.sia-controls{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:18px;}
.sia-primary{display:inline-flex;align-items:center;gap:8px;background:#4A90D9;color:#fff;border:none;border-radius:10px;padding:12px 22px;font-weight:700;font-size:15px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;transition:.12s;box-shadow:0 2px 6px rgba(74,144,217,.28);}
.sia-primary:hover:not(:disabled){filter:brightness(1.06);transform:translateY(-1px);}
.sia-primary:disabled{opacity:.5;cursor:not-allowed;}
.sia-errline{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#D9822B;}
.sia-empty{text-align:center;padding:54px 20px;color:var(--muted);border:1px dashed #CBD7DF;border-radius:14px;display:flex;flex-direction:column;align-items:center;gap:12px;background:#fff;}
.sia-empty p{margin:0;font-size:14px;max-width:470px;}
.sia-graphpanel{border:1px solid var(--line);border-radius:14px;background:var(--panel);box-shadow:0 1px 3px rgba(40,70,90,.05);padding:16px 18px 18px;margin-bottom:18px;}
.sia-graph-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px;}
.sia-summary{font-size:13px;color:var(--muted);margin-top:4px;}
.sia-graph-stat{display:flex;gap:14px;align-items:center;font-size:12.5px;color:var(--muted);flex-wrap:wrap;}
.sia-graph-stat strong{color:var(--text);}
.sia-scopepill{display:inline-flex;align-items:center;gap:5px;border-radius:6px;padding:3px 9px;font-size:12px;font-weight:600;}
.sia-scopepill.national{color:#2C6FC4;background:rgba(74,144,217,0.10);border:1px solid #cfe0f0;}
.sia-scopepill.local{color:#5E8A1A;background:rgba(156,204,60,0.16);border:1px solid #cfe3a8;}
.kn-src{font-size:10px;font-family:var(--mono);color:#2C6FC4;border:1px solid #cfe0f0;border-radius:5px;padding:2px 6px;}
.kn-canvas{position:relative;width:100%;border-radius:12px;overflow:hidden;background:radial-gradient(1000px 680px at 50% 42%,#ffffff,#eef3f8 96%);border:1px solid #DCE5EC;}
.kn-svg{width:100%;height:auto;display:block;cursor:grab;touch-action:none;}
.kn-svg:active{cursor:grabbing;}
.kn-node{animation:pop .45s cubic-bezier(.2,1.3,.4,1) backwards;}
.kn-circle{transition:r .1s ease;}
@keyframes pop{0%{opacity:0;transform:scale(.2);}100%{opacity:1;}}
.kn-link{stroke-dasharray:1;stroke-dashoffset:1;animation:draw .7s ease forwards;}
@keyframes draw{to{stroke-dashoffset:0;}}
.kn-tools{position:absolute;top:10px;right:10px;z-index:2;display:flex;gap:6px;}
.kn-tools button{width:32px;height:32px;border-radius:8px;border:1px solid #cdd9e0;background:#fff;color:#46606a;display:grid;place-items:center;cursor:pointer;box-shadow:0 1px 3px rgba(40,70,90,.12);}
.kn-tools button:hover{background:#f0f5f8;}
.kn-legend2{position:absolute;left:12px;bottom:10px;display:flex;gap:12px;flex-wrap:wrap;background:rgba(255,255,255,.9);border:1px solid #DCE5EC;border-radius:8px;padding:6px 10px;box-shadow:0 1px 4px rgba(40,70,90,.08);}
.kn-legend2 span{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#3a4d50;font-family:var(--mono);}
.kn-legend2 i{width:9px;height:9px;border-radius:50%;}
.kn-legend2 em{font-style:normal;color:#6c8085;}
.kn-tip{position:absolute;left:14px;top:12px;background:#fff;border:1px solid #DCE5EC;border-radius:10px;padding:9px 12px;pointer-events:none;box-shadow:0 8px 22px rgba(40,70,90,.18);max-width:320px;}
.kn-tip-kw{font-size:13px;font-weight:600;color:#1F2B31;}
.kn-tip-vol{font-size:12px;color:#5B6B73;margin-top:3px;}
.kn-tip-vol strong{font-family:var(--mono);color:#2C6FC4;}
.kn-tip-int{margin-left:6px;font-family:var(--mono);}
.kn-tip-hint{font-size:10.5px;color:#97A4AB;margin-top:4px;}
.sia-graphhint{text-align:center;margin:14px 0 2px;font-size:12.5px;color:var(--dim);}
.kn-dot{width:8px;height:8px;border-radius:50%;flex:none;display:inline-block;}
.kn-detail{margin-top:14px;border-top:1px solid var(--line);padding-top:16px;}
.kn-detail-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
.kn-detail-kw{font-family:var(--disp);font-size:19px;font-weight:600;color:#16242b;}
.kn-detail-meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px;}
.kn-badge{display:inline-flex;align-items:center;gap:5px;border:1px solid;border-radius:6px;padding:3px 9px;font-family:var(--mono);font-size:12px;}
.kn-vol-chip{font-size:12px;color:var(--muted);}
.kn-trend{display:inline-flex;align-items:center;gap:4px;border:1px solid;border-radius:6px;padding:3px 8px;font-size:11px;font-family:var(--mono);}
.kn-rel{font-size:12px;color:var(--muted);}.kn-rel strong{color:#2C6FC4;font-family:var(--mono);}
.kn-x{background:transparent;border:none;color:var(--dim);cursor:pointer;padding:4px;border-radius:7px;}
.kn-x:hover{color:#E8685E;background:rgba(232,104,94,0.1);}
.kn-detail-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:20px;margin-top:14px;}
.kn-sub{display:flex;align-items:center;gap:6px;font-size:11px;font-family:var(--mono);letter-spacing:.06em;color:var(--muted);text-transform:uppercase;margin-bottom:8px;}
.kn-season{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;}
.kn-stag{font-size:11px;font-family:var(--mono);border:1px solid;border-radius:6px;padding:3px 8px;background:#fff;}
.kn-ctype{font-size:13px;color:var(--muted);margin-bottom:9px;}
.kn-outline{margin:0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:6px;}
.kn-outline li{font-size:12.5px;color:var(--muted);line-height:1.5;padding-left:16px;position:relative;}
.kn-outline li::before{content:"›";position:absolute;left:2px;color:var(--accent);font-family:var(--mono);}
.kn-recenter{display:inline-flex;align-items:center;gap:6px;margin-top:16px;background:rgba(74,144,217,0.10);color:#2C6FC4;border:1px solid #cfe0f0;border-radius:9px;padding:9px 14px;font-size:13px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;transition:.12s;}
.kn-recenter:hover{background:rgba(74,144,217,0.18);}
.sia-foot{text-align:center;color:var(--dim);font-size:11px;font-family:var(--mono);margin-top:24px;padding-top:16px;border-top:1px solid var(--line);}
.sia-spin{animation:spin .9s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
@media (prefers-reduced-motion:reduce){.kn-node,.kn-link{animation:none;stroke-dashoffset:0;}}
@media (max-width:640px){.sia-root{padding:14px;}.kn-detail-grid{grid-template-columns:1fr;}.kn-legend2{display:none;}}
`;
