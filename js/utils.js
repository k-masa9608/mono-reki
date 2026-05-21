export const CATEGORIES = {
  'スマホ':     3.5,
  'PC':         5,
  'タブレット': 4,
  'イヤホン':   3,
  'カメラ':     6,
  'ゲーム機':   6,
  '時計':       5,
  'バッグ':     7,
  '洋服':       4,
  '家電':       8,
  '家具':       10,
  '自転車':     8,
  '楽器':       10,
  '車・バイク': 8,
};

export const CATEGORY_GROUPS = [
  { label: 'ガジェット', cats: ['スマホ', 'PC', 'タブレット', 'イヤホン', 'カメラ', 'ゲーム機'] },
  { label: 'ファッション', cats: ['時計', 'バッグ', '洋服'] },
  { label: '家・生活', cats: ['家電', '家具'] },
  { label: '趣味・乗り物', cats: ['自転車', '楽器', '車・バイク'] },
];

export const RANKS = ['SS', 'S', 'A', 'B', 'C', 'D'];

export const RANK_META = {
  SS: { bg: 'linear-gradient(135deg,#ff6fd8,#3813c2)', text: '#fff', border: '#c084fc', label: '伝説級' },
  S:  { bg: '#FFD700', text: '#000', border: '#d97706', label: '超優秀' },
  A:  { bg: '#4ade80', text: '#000', border: '#16a34a', label: '優秀' },
  B:  { bg: '#38bdf8', text: '#000', border: '#0284c7', label: '良好' },
  C:  { bg: '#fb923c', text: '#fff', border: '#ea580c', label: '普通' },
  D:  { bg: '#f87171', text: '#fff', border: '#dc2626', label: '要注意' },
};

export function calcDays(startDate, endDate = null) {
  const start = new Date(startDate + 'T00:00:00');
  const end   = endDate ? new Date(endDate + 'T00:00:00') : new Date();
  end.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((end - start) / 86400000));
}

export function dailyCost(actualPrice, days) {
  if (!actualPrice || actualPrice <= 0) return null;
  return actualPrice / days;
}

// カテゴリ平均年数に対する使用期間の比率でランクを決定
export function getRank(ratio) {
  if (ratio == null || isNaN(ratio)) return null;
  if (ratio >= 2.0)  return 'SS';
  if (ratio >= 1.5)  return 'S';
  if (ratio >= 1.0)  return 'A';
  if (ratio >= 0.75) return 'B';
  if (ratio >= 0.5)  return 'C';
  return 'D';
}

export function hasPrice(item) {
  return item.actualPrice && item.actualPrice > 0;
}

export function daysForRank(rank, actualPrice) {
  if (!actualPrice) return Infinity;
  const t = { SS: 10, S: 30, A: 100, B: 200, C: 400 }[rank];
  return t ? Math.ceil(actualPrice / t) : Infinity;
}

export function fmtYears(days) {
  if (days < 30)  return `${days}日`;
  if (days < 365) return `${Math.floor(days / 30)}ヶ月`;
  const y = days / 365, yI = Math.floor(y), m = Math.round((y - yI) * 12);
  return m > 0 ? `${yI}年${m}ヶ月` : `${yI}年`;
}

export function fmtYearsDecimal(days) {
  return (days / 365).toFixed(1);
}

export function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '—';
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

export function fmtDate(s) {
  if (!s) return '—';
  const [y, mo, d] = s.split('-');
  return `${y}/${mo}/${d}`;
}

export function buildProgressBar(days, avgYears, borderColor) {
  const used   = days / 365;
  const max    = Math.max(avgYears * 1.7, used * 1.1);
  const avgPct = (avgYears / max) * 100;
  const usedPct = Math.min((used / max) * 100, 100);
  const over   = used >= avgYears;

  const normalPct = Math.min(usedPct, avgPct);
  const exceedPct = over ? Math.max(0, usedPct - avgPct) : 0;
  const fillColor = over ? '#4ade80' : (borderColor || '#3b82f6');

  return `
    <div class="pb-wrap">
      <div class="pb">
        <div class="pb-fill" style="width:${normalPct.toFixed(1)}%;background:${fillColor}"></div>
        ${over ? `<div class="pb-exceed" style="left:${avgPct.toFixed(1)}%;width:${exceedPct.toFixed(1)}%"></div>` : ''}
        <div class="pb-marker ${over ? 'over' : ''}" style="left:${avgPct.toFixed(1)}%"></div>
      </div>
      <div class="pb-footer">
        <span class="pb-avg-label ${over ? 'over' : ''}" style="left:${avgPct.toFixed(1)}%">${avgYears}年</span>
      </div>
    </div>`;
}

export function scoreTimeline(actualPrice, currentDays, avgYears) {
  if (!actualPrice) return [];
  const avgDays = Math.round(avgYears * 365);
  const pts = [
    { label: '1ヶ月',             days: 30 },
    { label: '6ヶ月',             days: 180 },
    { label: '1年',               days: 365 },
    { label: '現在',              days: currentDays, isCurrent: true },
    { label: `avg ${avgYears}年`, days: avgDays },
    { label: `${(avgYears*1.5).toFixed(1)}年`, days: Math.round(avgDays * 1.5) },
  ];
  const seen = new Set();
  return pts
    .sort((a, b) => a.days - b.days)
    .filter(p => { if (seen.has(p.days)) return false; seen.add(p.days); return true; })
    .map(p => {
      const cost = dailyCost(actualPrice, p.days);
      const ratio = p.days / (avgYears * 365);
      return { ...p, cost, rank: getRank(ratio) };
    });
}

export const USAGE_FREQ_OPTIONS = ['毎日', '週数回', '週1', '月数回', 'たまに'];
export const DISPOSAL_REASONS   = ['故障', 'モデルチェンジ', '売却', '譲渡', '紛失', 'その他'];

export function getMilestone(days) {
  const y = days / 365;
  if (y >= 10) return { emoji: '🏆', label: '10年+', color: '#d97706' };
  if (y >= 7)  return { emoji: '💫', label: '7年+',  color: '#8b5cf6' };
  if (y >= 5)  return { emoji: '⭐', label: '5年+',  color: '#3b82f6' };
  if (y >= 3)  return { emoji: '🌳', label: '3年+',  color: '#16a34a' };
  if (y >= 1)  return { emoji: '🌿', label: '1年+',  color: '#6b7280' };
  return null;
}

// カテゴリ平均年数（ユーザーカスタマイズ優先）
export function getCatAvg(category) {
  try {
    const custom = JSON.parse(localStorage.getItem('mono_cat_avgs') || '{}');
    return custom[category] ?? CATEGORIES[category] ?? 5;
  } catch { return CATEGORIES[category] ?? 5; }
}

export function setCatAvg(category, years) {
  try {
    const custom = JSON.parse(localStorage.getItem('mono_cat_avgs') || '{}');
    custom[category] = years;
    localStorage.setItem('mono_cat_avgs', JSON.stringify(custom));
  } catch {}
}

export function resetCatAvgs() {
  localStorage.removeItem('mono_cat_avgs');
}

export function genId() { return crypto.randomUUID(); }

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// デモデータ（実データ 22件）
export const DEMO_ITEMS = [
  { id:'1',  name:'ポーター タイム デイパック',  category:'バッグ',    purchaseDate:'2019-05-20', startDate:'2019-05-22', listPrice:38880,  actualPrice:27293,  purchasePlace:'Yahooショッピング',                   endDate:null,         memo:'ポーター タイム デイパック 655-06169 カラー：ネイビー',                        usageFreq:null, prevItemId:null },
  { id:'2',  name:'AirPods 第1世代',            category:'イヤホン',  purchaseDate:null,         startDate:'2019-04-08', listPrice:18800,  actualPrice:18800,  purchasePlace:null,                                  endDate:'2020-07-31', memo:'AirPods 第1世代',                                                               usageFreq:null, prevItemId:null },
  { id:'3',  name:'AirPods Pro',                category:'イヤホン',  purchaseDate:'2020-03-31', startDate:'2020-09-04', listPrice:31150,  actualPrice:22751,  purchasePlace:'Yahooショッピング',                   endDate:'2025-09-09', memo:'Apple AirPods Pro MWP22J/A',                                                    usageFreq:'毎日', prevItemId:'2' },
  { id:'4',  name:'AirPods Pro 3',              category:'イヤホン',  purchaseDate:'2025-09-10', startDate:'2025-09-20', listPrice:39800,  actualPrice:39800,  purchasePlace:'Apple Store',                         endDate:null,         memo:'AirPods Pro 3',                                                                 usageFreq:'毎日', prevItemId:'3' },
  { id:'5',  name:'MacBook Air M1',             category:'PC',        purchaseDate:'2023-01-03', startDate:'2023-01-11', listPrice:134800, actualPrice:99559,  purchasePlace:'Apple Store',                         endDate:null,         memo:'M1チップ搭載MacBook Air スペースグレイ',                                        usageFreq:'毎日', prevItemId:null },
  { id:'6',  name:'iPhone 4S',                  category:'スマホ',    purchaseDate:null,         startDate:'2012-03-09', listPrice:63360,  actualPrice:63360,  purchasePlace:'Softbankショップ',                    endDate:'2013-10-09', memo:'iPhone4S 32GB ブラック',                                                        usageFreq:null, prevItemId:null },
  { id:'7',  name:'iPhone 5S',                  category:'スマホ',    purchaseDate:null,         startDate:'2013-10-10', listPrice:81120,  actualPrice:81120,  purchasePlace:'Softbankショップ',                    endDate:'2016-09-24', memo:'iPhone5S 32GB シャンパンゴールド',                                              usageFreq:null, prevItemId:'6' },
  { id:'8',  name:'iPhone 7',                   category:'スマホ',    purchaseDate:'2016-09-09', startDate:'2016-09-25', listPrice:85800,  actualPrice:85800,  purchasePlace:'Softbankショップ',                    endDate:'2018-05-28', memo:'iPhone7 128GB ジェットブラック',                                                usageFreq:null, prevItemId:'7' },
  { id:'9',  name:'iPhone 8',                   category:'スマホ',    purchaseDate:'2018-05-29', startDate:'2018-05-29', listPrice:78800,  actualPrice:78800,  purchasePlace:'Softbankショップ',                    endDate:'2021-09-17', memo:'iPhone 8',                                                                      usageFreq:null, prevItemId:'8' },
  { id:'10', name:'iPhone 13 mini',             category:'スマホ',    purchaseDate:'2021-09-17', startDate:'2021-09-24', listPrice:98800,  actualPrice:98800,  purchasePlace:'Apple Store',                         endDate:'2025-10-12', memo:'iPhone 13 mini 256GB ミッドナイト',                                             usageFreq:'毎日', prevItemId:'9' },
  { id:'11', name:'iPhone 17',                  category:'スマホ',    purchaseDate:'2025-10-11', startDate:'2025-10-12', listPrice:164800, actualPrice:164800, purchasePlace:'Apple Store',                         endDate:null,         memo:'iPhone 17 512GB ブラック',                                                      usageFreq:'毎日', prevItemId:'10' },
  { id:'12', name:'Apple Watch 7',              category:'時計',      purchaseDate:'2021-10-26', startDate:'2021-10-26', listPrice:48800,  actualPrice:48800,  purchasePlace:'Apple Store',                         endDate:null,         memo:'Apple Watch Nike Series 7 GPSモデル 45mm ミッドナイト',                         usageFreq:'毎日', prevItemId:null },
  { id:'13', name:'iPad 無印第7世代',           category:'タブレット',purchaseDate:'2020-07-01', startDate:'2020-07-02', listPrice:38280,  actualPrice:38280,  purchasePlace:'Amazon',                              endDate:null,         memo:'Apple iPad 10.2インチ Wi-Fi 32GB スペースグレイ',                               usageFreq:'週数回', prevItemId:null },
  { id:'14', name:'Hisense TV 50インチ',        category:'家電',      purchaseDate:'2019-08-15', startDate:'2019-08-16', listPrice:72700,  actualPrice:50341,  purchasePlace:'Yahooショッピング',                   endDate:null,         memo:'Hisense 50A6800 50V型 4K対応LED液晶テレビ',                                    usageFreq:'毎日', prevItemId:null },
  { id:'15', name:'冷蔵庫 450L',                category:'家電',      purchaseDate:'2023-06-26', startDate:'2023-07-04', listPrice:209800, actualPrice:78000,  purchasePlace:'メルカリ',                             endDate:null,         memo:'パナソニック NR-E459PX-N 450L 2021年製',                                        usageFreq:null, prevItemId:null },
  { id:'16', name:'abrasus 財布',               category:'バッグ',    purchaseDate:'2019-05-03', startDate:'2019-05-09', listPrice:18040,  actualPrice:15590,  purchasePlace:'Yahooショッピング',                   endDate:null,         memo:'abrasus 薄い財布',                                                              usageFreq:'毎日', prevItemId:null },
  { id:'17', name:'テールメイトS',              category:'バッグ',    purchaseDate:null,         startDate:'2018-10-16', listPrice:13200,  actualPrice:13200,  purchasePlace:null,                                  endDate:null,         memo:'テールメイトS',                                                                 usageFreq:'週数回', prevItemId:null },
  { id:'18', name:'マンティス 26 バックパック', category:'バッグ',    purchaseDate:null,         startDate:'2018-07-03', listPrice:33000,  actualPrice:33000,  purchasePlace:null,                                  endDate:null,         memo:'ザ・ノース・フェイス バックパック マンティス 26',                                usageFreq:'週1', prevItemId:null },
  { id:'19', name:'Nintendo Switch',            category:'ゲーム機',  purchaseDate:'2018-07-05', startDate:'2018-07-09', listPrice:32378,  actualPrice:32378,  purchasePlace:'Joshin web',                          endDate:'2025-08-22', memo:'Nintendo Switch 初代',                                                           usageFreq:'週数回', prevItemId:null },
  { id:'20', name:'Nintendo Switch 2',          category:'ゲーム機',  purchaseDate:'2025-08-23', startDate:'2025-08-23', listPrice:49980,  actualPrice:49980,  purchasePlace:'ビックカメラ新宿',                     endDate:null,         memo:'Nintendo Switch 2 マリオカート ワールド セット',                                 usageFreq:'週数回', prevItemId:'19' },
  { id:'21', name:'サッチェルM 別注',           category:'バッグ',    purchaseDate:'2025-09-24', startDate:'2025-09-24', listPrice:15400,  actualPrice:15400,  purchasePlace:'UNITED ARROWS green label relaxing にこたま', endDate:null, memo:'SATCHEL M V3 UTD ARWS',                                                       usageFreq:'週数回', prevItemId:null },
  { id:'22', name:'エクストラショット',         category:'バッグ',    purchaseDate:'2022-08-20', startDate:'2022-08-21', listPrice:13579,  actualPrice:13579,  purchasePlace:'Amazon',                              endDate:null,         memo:'ザ・ノース・フェイス バックパック エクストラショット',                            usageFreq:'週1', prevItemId:null },
];
