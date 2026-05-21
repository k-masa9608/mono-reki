import { CATEGORIES, calcDays, fmtYearsDecimal, dailyCost, hasPrice,
         getRank, RANK_META, fmtCurrency, getCatAvg } from '../utils.js';

const CAT_COLORS = {
  'スマホ':    '#3b82f6', 'PC':        '#8b5cf6', 'タブレット':'#a78bfa',
  'イヤホン':  '#10b981', 'カメラ':    '#0ea5e9', 'ゲーム機':  '#ec4899',
  '時計':      '#6366f1', 'バッグ':    '#d97706', '洋服':      '#f43f5e',
  '家電':      '#ef4444', '家具':      '#84cc16', '自転車':    '#06b6d4',
  '楽器':      '#a855f7', '車・バイク':'#64748b',
};
const CAT_ICONS = {
  'スマホ':'📱','PC':'💻','タブレット':'📟','イヤホン':'🎧','カメラ':'📷','ゲーム機':'🎮',
  '時計':'⌚','バッグ':'🎒','洋服':'👔','家電':'📺','家具':'🪑','自転車':'🚲','楽器':'🎸','車・バイク':'🚗',
};
const FREQ_PER_YEAR = { '毎日':365, '週数回':156, '週1':52, '月数回':24, 'たまに':12 };

let _view      = 'years';   // 'years' | 'cost'
let _timeSort  = 'cat';     // 'cat' | 'old' | 'new'
let _costSort  = 'day_asc'; // 'day_asc' | 'day_desc' | 'use_asc' | 'use_desc'
let _timeRange = '5y';      // '3y' | '5y' | 'all'

// ── インサイト ──────────────────────────────────────
function buildInsights(items) {
  const active = items.filter(i => !i.endDate);
  if (active.length < 2) return '';
  const catDaysMap = {};
  for (const item of active) {
    if (!catDaysMap[item.category]) catDaysMap[item.category] = [];
    catDaysMap[item.category].push(calcDays(item.startDate));
  }
  const topCat = Object.entries(catDaysMap)
    .map(([cat, arr]) => ({ cat, avg: arr.reduce((s,d)=>s+d,0)/arr.length }))
    .sort((a,b)=>b.avg-a.avg)[0];
  const priced  = active.filter(i => hasPrice(i));
  const bestItem = priced.length
    ? priced.reduce((best,i) =>
        dailyCost(i.actualPrice,calcDays(i.startDate)) < dailyCost(best.actualPrice,calcDays(best.startDate)) ? i : best)
    : null;
  const longest = active.reduce((a,b) => calcDays(a.startDate)>calcDays(b.startDate)?a:b);
  return `
  <div class="gi-wrap">
    <div class="gi-item">
      <div class="gi-label">最長カテゴリ</div>
      <div class="gi-val">${CAT_ICONS[topCat.cat]||'📦'} ${topCat.cat}</div>
      <div class="gi-sub">平均 ${fmtYearsDecimal(topCat.avg)}年</div>
    </div>
    ${bestItem ? `
    <div class="gi-sep"></div>
    <div class="gi-item">
      <div class="gi-label">最安コスパ</div>
      <div class="gi-val">¥${Math.round(dailyCost(bestItem.actualPrice,calcDays(bestItem.startDate)))}<span class="gi-unit">/日</span></div>
      <div class="gi-sub">${bestItem.name}</div>
    </div>` : ''}
    <div class="gi-sep"></div>
    <div class="gi-item">
      <div class="gi-label">最長使用中</div>
      <div class="gi-val">${fmtYearsDecimal(calcDays(longest.startDate))}<span class="gi-unit">年</span></div>
      <div class="gi-sub">${longest.name}</div>
    </div>
  </div>`;
}

// ── ランク分布 ──────────────────────────────────────
function buildRankDist(items) {
  const active = items.filter(i => !i.endDate);
  if (active.length < 3) return '';
  const counts = { SS:0, S:0, A:0, B:0, C:0, D:0 };
  for (const item of active) {
    const days  = calcDays(item.startDate);
    const avg   = (getCatAvg(item.category));
    const ratio = days / (avg * 365);
    const rank  = getRank(ratio);
    if (rank) counts[rank]++;
  }
  const total = active.length;
  const bars = Object.entries(counts).map(([rank, n]) => {
    const meta = RANK_META[rank];
    const pct  = total > 0 ? (n / total) * 100 : 0;
    if (!n) return '';
    return `
    <div class="rd-row">
      <span class="rd-rank" style="background:${meta.bg};color:${meta.text}">${rank}</span>
      <div class="rd-track">
        <div class="rd-fill" style="width:${pct.toFixed(1)}%;background:${meta.border}"></div>
      </div>
      <span class="rd-count">${n}</span>
    </div>`;
  }).join('');
  return `<div class="rd-wrap">${bars}</div>`;
}

// ── 年数タイムライン ────────────────────────────────
function renderYears(items) {
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
  const parseDate = s => new Date(s+'T00:00:00');

  // ── 表示期間の決定 ──
  let minDate;
  if (_timeRange === 'all') {
    const allStarts = items.map(i=>parseDate(i.startDate));
    minDate = new Date(Math.min(...allStarts));
    minDate.setMonth(minDate.getMonth()-1);
  } else {
    const yrs = _timeRange === '3y' ? 3 : 5;
    minDate = new Date(todayDate);
    minDate.setFullYear(minDate.getFullYear() - yrs);
  }
  const allEnds = items.map(i=>i.endDate?parseDate(i.endDate):new Date(todayDate));
  let maxDate = new Date(Math.max(...allEnds));
  maxDate.setMonth(maxDate.getMonth()+2);
  const totalMs = maxDate - minDate;

  // ── 表示対象フィルタ（終了日が期間内 or 使用中） ──
  const visibleItems = _timeRange === 'all' ? items : items.filter(i => {
    const end = i.endDate ? parseDate(i.endDate) : new Date(todayDate);
    return end > minDate;
  });
  const hiddenCount = items.length - visibleItems.length;

  // 範囲が広いほど年ラベルを間引く（重なり防止）
  const yearSpan = maxDate.getFullYear() - minDate.getFullYear();
  const step = yearSpan > 12 ? 3 : yearSpan > 6 ? 2 : 1;
  const startY = Math.ceil((minDate.getFullYear() + 1) / step) * step;
  const yearMarkers = [];
  for (let y=startY; y<=maxDate.getFullYear(); y+=step) {
    const pct = (new Date(y,0,1)-minDate)/totalMs*100;
    if (pct>2&&pct<98) yearMarkers.push({year:y,pct});
  }
  const gridLines = yearMarkers.map(m=>`<div class="tl-grid-line" style="left:${m.pct.toFixed(1)}%"></div>`).join('');

  let sorted = [...visibleItems];
  if (_timeSort==='old') sorted.sort((a,b)=>a.startDate.localeCompare(b.startDate));
  else if (_timeSort==='new') sorted.sort((a,b)=>b.startDate.localeCompare(a.startDate));
  else sorted.sort((a,b)=>{const cc=a.category.localeCompare(b.category,'ja');return cc!==0?cc:a.startDate.localeCompare(b.startDate);});

  let rowsHtml = ''; let lastCat = null;
  for (const item of sorted) {
    if (_timeSort==='cat' && item.category!==lastCat) {
      lastCat = item.category;
      const color = CAT_COLORS[item.category]||'#3b82f6';
      rowsHtml += `<div class="tl-cat-header"><span class="tl-cat-header-dot" style="background:${color}"></span><span>${CAT_ICONS[item.category]||'📦'} ${item.category}</span></div>`;
    }
    const start   = parseDate(item.startDate);
    const end     = item.endDate?parseDate(item.endDate):new Date(todayDate);
    const rawLeft = (start - minDate) / totalMs * 100;
    const beforeWindow = rawLeft < 0;           // 期間より前から使い始めたアイテム
    const left    = Math.max(0, rawLeft);
    const rawW    = (end - start) / totalMs * 100;
    const width   = Math.min(100 - left, beforeWindow ? rawW + rawLeft : rawW);
    const color   = CAT_COLORS[item.category]||'#3b82f6';
    const days    = calcDays(item.startDate, item.endDate);
    const usedY   = fmtYearsDecimal(days);
    const alpha   = item.endDate ? '0.4' : '1';
    const icon    = _timeSort!=='cat'?(CAT_ICONS[item.category]||'📦'):'';
    const barClass = `tl-bar${beforeWindow ? ' tl-bar--before' : ''}`;
    const avg     = getCatAvg(item.category);
    const ratio   = days / (avg * 365);
    const rank    = getRank(ratio);
    const meta    = rank ? RANK_META[rank] : null;
    const rankCol = meta
      ? `<div class="tl-rank-col"><span class="tl-rank-col-badge" style="background:${meta.bg};color:${meta.text}">${rank}</span></div>`
      : `<div class="tl-rank-col"></div>`;

    // 平均年数マークの位置（使用開始日 + 平均日数）
    const avgDate = new Date(start.getTime() + avg * 365 * 86400000);
    const avgPct  = (avgDate - minDate) / totalMs * 100;
    const overAvg = days >= avg * 365;
    // バー内に収まるときだけ表示
    const avgLine = overAvg && avgPct >= left && avgPct <= left + Math.max(width, 0.5)
      ? `<div class="tl-avg-mark" style="left:${avgPct.toFixed(1)}%"><span class="tl-avg-lbl">平均${avg}年</span></div>`
      : '';

    rowsHtml += `
    <div class="tl-row" data-id="${item.id}">
      <div class="tl-name" title="${item.name}">${icon?`<span class="tl-row-icon">${icon}</span>`:''}${item.name}</div>
      ${rankCol}
      <div class="tl-track">
        ${gridLines}
        <div class="${barClass}" style="left:${left.toFixed(1)}%;width:${Math.max(width,0.5).toFixed(1)}%;background:${color};opacity:${alpha}">
          ${width>7?`<span class="tl-bar-label">${usedY}年</span>`:''}
        </div>
        ${avgLine}
      </div>
    </div>`;
  }

  const sortBtns = [['cat','カテゴリ順'],['old','古い順'],['new','新しい順']]
    .map(([v,l])=>`<button class="tl-sort-btn${_timeSort===v?' active':''}" data-tsort="${v}">${l}</button>`).join('');
  const rangeBtns = [['3y','直近3年'],['5y','直近5年'],['all','全期間']]
    .map(([v,l])=>`<button class="tl-sort-btn tl-range-btn${_timeRange===v?' active':''}" data-trange="${v}">${l}</button>`).join('');
  const axisHtml = yearMarkers.map(m=>`<div class="tl-year-tick" style="left:${m.pct.toFixed(1)}%">${m.year}</div>`).join('');
  const hiddenNote = hiddenCount > 0
    ? `<span class="tl-hidden-note">＋${hiddenCount}件は全期間で表示</span>` : '';

  const bodyContent = visibleItems.length === 0
    ? `<div class="tl-empty-range">
        <p>この期間に該当するアイテムがありません</p>
        <button class="tl-sort-btn" data-trange="all" style="margin-top:8px">全期間を表示</button>
      </div>`
    : `<div class="tl-panel">
        <div class="tl-axis-row">
          <div class="tl-axis-spacer"></div>
          <div class="tl-axis-spacer tl-axis-rank-spacer"></div>
          <div class="tl-axis-marks">${axisHtml}</div>
        </div>
        <div class="tl-scroll-body">
          <div class="tl-wrap">
            <div class="tl-rows">${rowsHtml}</div>
          </div>
        </div>
      </div>`;

  return {
    controls: `
      <div class="tl-sort-row">${rangeBtns}</div>
      <div class="tl-sort-row">${sortBtns}</div>
      <div class="tl-hint-row">
        <span class="tl-hint">薄い色＝終了済み・タップで詳細</span>
        ${hiddenNote}
      </div>`,
    body: bodyContent,
  };
}

// ── コスト・回数バーチャート ─────────────────────────
function renderCostBars(items) {
  const targets = items.filter(i => !i.endDate && hasPrice(i));

  if (!targets.length) {
    return { controls: '', body: `<div class="empty-state"><p class="empty-icon">📊</p><p class="empty-text">金額が登録されたアイテムがありません</p></div>` };
  }

  const entries = targets.map(item => {
    const days    = calcDays(item.startDate);
    const costDay = item.actualPrice / days;
    const freq    = item.usageFreq && FREQ_PER_YEAR[item.usageFreq];
    const costUse = freq ? item.actualPrice / (freq * (days / 365)) : null;
    const ratio   = days / ((getCatAvg(item.category)) * 365);
    const rank    = getRank(ratio);
    const meta    = rank ? RANK_META[rank] : null;
    return { item, costDay, costUse, days, rank, meta };
  });

  const useDay = _costSort.startsWith('day');
  const sorted = [...entries].sort((a, b) => {
    if (_costSort === 'day_asc')  return a.costDay - b.costDay;
    if (_costSort === 'day_desc') return b.costDay - a.costDay;
    const au = a.costUse ?? (_costSort === 'use_asc' ? Infinity : -Infinity);
    const bu = b.costUse ?? (_costSort === 'use_asc' ? Infinity : -Infinity);
    return _costSort === 'use_asc' ? au - bu : bu - au;
  });
  const maxVal = Math.max(...sorted.map(e => useDay ? e.costDay : (e.costUse ?? 0)), 1);

  const sortBtns = [
    ['day_asc','¥/日↑'],['day_desc','¥/日↓'],
    ['use_asc','¥/回↑'],['use_desc','¥/回↓'],
  ].map(([v,l])=>`<button class="tl-sort-btn${_costSort===v?' active':''}" data-csort="${v}">${l}</button>`).join('');

  const rows = sorted.map(({ item, costDay, costUse, days, rank, meta }) => {
    const barVal = useDay ? costDay : (costUse ?? 0);
    const pct    = barVal > 0 ? (barVal / maxVal) * 100 : 0;
    const color  = meta ? meta.border : '#94a3b8';
    const icon   = CAT_ICONS[item.category]||'📦';
    const badge  = meta ? `<span class="cb-rank" style="background:${meta.bg};color:${meta.text}">${rank}</span>` : '';
    const usedY  = fmtYearsDecimal(days);
    const dayStr = `¥${Math.round(costDay).toLocaleString()}/日`;
    const useStr = costUse != null
      ? `${item.usageFreq} ¥${Math.round(costUse).toLocaleString()}/回`
      : `—/回`;
    return `
    <div class="cb-row" data-id="${item.id}">
      <div class="cb-name" title="${item.name}">${icon} ${item.name}</div>
      <div class="cb-track">
        <div class="cb-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
      </div>
      <div class="cb-sub">${usedY}年使用</div>
      <div class="cb-vals">
        <span class="${useDay ? 'cb-val-main' : 'cb-val-dim'}">${dayStr}</span>
        <span class="${!useDay ? 'cb-val-main' : 'cb-val-dim'}">${useStr}</span>
      </div>
      ${badge}
    </div>`;
  }).join('');

  return {
    controls: `<div class="tl-sort-row">${sortBtns}</div><div class="tl-hint">¥/回は使用頻度登録済みのみ有効</div>`,
    body: `<div class="cb-panel"><div class="cb-scroll-body"><div class="cb-list">${rows}</div></div></div>`,
  };
}

// ── render ──────────────────────────────────────────
export function render(items) {
  if (!items.length) {
    return {
      headerExtra: '',
      body: `<div class="empty-state"><p class="empty-icon">📅</p><p class="empty-text">アイテムがありません</p><p class="empty-sub">ヘッダーの＋ボタンで追加しよう</p></div>`,
    };
  }

  const viewTabs = [['years','年数'],['cost','コスト・回数']]
    .map(([v,l])=>`<button class="g-view-tab${_view===v?' active':''}" data-view="${v}">${l}</button>`).join('');

  const { controls, body } = _view==='years' ? renderYears(items) : renderCostBars(items);

  return {
    headerExtra: `
      <div class="graph-header-controls">
        <div class="g-view-tabs">${viewTabs}</div>
        <div class="tl-controls">${controls}</div>
      </div>`,
    body: `
      <div id="graph-view">
        <div class="section">
          ${buildInsights(items)}
          ${buildRankDist(items)}
        </div>
        <div class="section graph-body">${body}</div>
      </div>`,
  };
}

// ── init ─────────────────────────────────────────────
export function init(items, navigate, openModal) {
  document.querySelectorAll('.g-view-tab').forEach(btn => {
    btn.addEventListener('click', () => { _view = btn.dataset.view; navigate('graph'); });
  });
  document.querySelectorAll('[data-tsort]').forEach(btn => {
    btn.addEventListener('click', () => { _timeSort = btn.dataset.tsort; navigate('graph'); });
  });
  document.querySelectorAll('[data-trange]').forEach(btn => {
    btn.addEventListener('click', () => { _timeRange = btn.dataset.trange; navigate('graph'); });
  });
  document.querySelector('.tl-hidden-note')?.addEventListener('click', () => {
    _timeRange = 'all'; navigate('graph');
  });
  document.querySelectorAll('[data-csort]').forEach(btn => {
    btn.addEventListener('click', () => { _costSort = btn.dataset.csort; navigate('graph'); });
  });
  if (openModal) {
    document.querySelectorAll('.tl-row[data-id],.cb-row[data-id]').forEach(row => {
      row.addEventListener('click', () => openModal(row.dataset.id));
    });
  }
}
