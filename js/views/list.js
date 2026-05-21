import { CATEGORIES, calcDays, dailyCost, hasPrice,
         fmtYearsDecimal, fmtCurrency, fmtDate, getRank, RANK_META, getMilestone, getCatAvg } from '../utils.js';

function calcTotalSavings(items) {
  let total = 0, count = 0;
  for (const i of items) {
    if (!i.actualPrice || i.endDate) continue;
    const days = calcDays(i.startDate);
    const avgDays = getCatAvg(i.category) * 365;
    if (days > avgDays) { total += Math.round(i.actualPrice * (days - avgDays) / avgDays); count++; }
  }
  return { total, count };
}

function endedCard(item, maxDays) {
  const days    = calcDays(item.startDate, item.endDate);
  const usedY   = fmtYearsDecimal(days);
  const priced  = hasPrice(item);
  const cost    = priced ? dailyCost(item.actualPrice, days) : null;
  const catIcon = item.icon || CAT_ICONS[item.category] || '📦';
  const endYM   = item.endDate ? item.endDate.slice(0, 7).replace('-', '.') : '';

  const showWave = days > WAVE_THRESHOLD_DAYS;
  const barDays  = showWave ? maxDays : days;
  const fillPct  = Math.min(barDays / maxDays, 1) * 100;

  const reasonHtml = item.disposalReason
    ? `<span class="cv2-disposal">${item.disposalReason}</span>`
    : `<span class="cv2-cat">${item.category}</span>`;

  return `
  <div class="cv2 cv2-archived" data-id="${item.id}">
    <div class="cv2-row">
      <span class="cv2-icon">${catIcon}</span>
      <span class="cv2-name">${item.name}</span>
      ${reasonHtml}
      <span class="cv2-years">${usedY}<small>年</small></span>
      ${priced ? `<span class="cv2-cost">${fmtCurrency(Math.round(cost))}/日</span>` : ''}
    </div>
    <div class="cv2-bar-row">
      <div class="cv2-bar-track">
        <div class="cv2-bar-fill" style="width:${fillPct.toFixed(1)}%;background:#94a3b8"></div>
        ${showWave ? `<span class="cv2-wave" style="color:#94a3b8">〜〜〜</span>` : ''}
      </div>
      <span class="cv2-end-date">${endYM} 終了</span>
    </div>
  </div>`;
}

const CAT_ICONS = {
  'スマホ':'📱','PC':'💻','タブレット':'📟','イヤホン':'🎧',
  'カメラ':'📷','ゲーム機':'🎮','時計':'⌚','バッグ':'🎒',
  '洋服':'👔','家電':'📺','家具':'🪑','自転車':'🚲',
  '楽器':'🎸','車・バイク':'🚗',
};

// にゅろ〜を出す閾値（日）—— 15年超えのみ
const WAVE_THRESHOLD_DAYS = 15 * 365;

function cardColor(item, days) {
  if (item.endDate) return '#94a3b8';
  const avg  = getCatAvg(item.category);
  const over = days >= avg * 365;
  if (!hasPrice(item)) return '#3b82f6';
  if (over) return '#22c55e';
  const cost = dailyCost(item.actualPrice, days);
  if (cost < 30)  return '#22c55e';
  if (cost < 100) return '#3b82f6';
  if (cost < 300) return '#f97316';
  return '#ef4444';
}

function buildCardBar(days, avgYears, color) {
  const usedYrs   = days / 365;
  const over      = usedYrs >= avgYears;
  const max       = Math.max(avgYears * 1.7, usedYrs * 1.1, avgYears + 0.5);
  const avgPct    = Math.min((avgYears / max) * 100, 92);
  const usedPct   = Math.min((usedYrs / max) * 100, 99);
  const normalPct = Math.min(usedPct, avgPct);
  const exceedPct = over ? Math.max(0, usedPct - avgPct) : 0;
  const fillColor = over ? '#22c55e' : color;
  return `
  <div class="cvb-wrap">
    <div class="cvb-track">
      <div class="cvb-fill" style="width:${normalPct.toFixed(1)}%;background:${fillColor}"></div>
      ${over ? `<div class="cvb-exceed" style="left:${avgPct.toFixed(1)}%;width:${exceedPct.toFixed(1)}%"></div>` : ''}
      <div class="cvb-tick${over?' over':''}" style="left:${avgPct.toFixed(1)}%"></div>
    </div>
    <div class="cvb-lbl${over?' over':''}" style="left:${avgPct.toFixed(1)}%">平均${avgYears}年</div>
  </div>`;
}

// maxDays: リスト内の最長日数（比例バーの基準）
function itemCard(item, maxDays) {
  const days   = calcDays(item.startDate, item.endDate);
  const cost   = dailyCost(item.actualPrice, days);
  const usedY  = fmtYearsDecimal(days);
  const color  = cardColor(item, days);
  const avg    = getCatAvg(item.category);
  const priced = hasPrice(item);
  const ratio  = days / (avg * 365);
  const rank   = getRank(ratio);
  const meta   = rank ? RANK_META[rank] : null;
  const ms     = !item.endDate ? getMilestone(days) : null;

  const rankBadge = meta
    ? `<span class="cv2-rank${rank==='SS'?' cv2-rank-ss':''}" style="background:${meta.bg};color:${meta.text}">${rank}</span>`
    : '';

  const catIcon = item.icon || CAT_ICONS[item.category] || '📦';

  const metaParts = [];
  if (item.purchaseDate) metaParts.push(fmtDate(item.purchaseDate));
  else if (item.startDate) metaParts.push(fmtDate(item.startDate) + '〜');
  if (item.actualPrice) metaParts.push(fmtCurrency(item.actualPrice));
  const metaHtml = metaParts.length
    ? `<span class="cv2-meta">${metaParts.join(' · ')}</span>`
    : '';

  const accent = meta ? meta.border : (item.endDate ? '#cbd5e1' : '#e2e8f0');
  return `
  <div class="cv2${item.endDate ? ' ended' : ''}" data-id="${item.id}" style="--accent:${accent}">
    <div class="cv2-row">
      <span class="cv2-icon">${catIcon}</span>
      <span class="cv2-name">${item.name}</span>
      ${rankBadge}
      <span class="cv2-years" style="color:${color}">${usedY}<small>年</small></span>
    </div>
    <div class="cv2-b2row">
      ${buildCardBar(days, avg, color)}
      ${metaHtml}
    </div>
  </div>`;
}

const CAT_ICONS_MS = CAT_ICONS; // 統合済み（重複排除）
const MILESTONE_YEARS = [1, 3, 5, 7, 10];

// マイルストーン＋超過を1本のストリップに統合
function buildNoticeStrip(items) {
  const todayMs = new Date(new Date().toDateString()).getTime();
  const chips = [];

  for (const item of items.filter(i => !i.endDate)) {
    for (const mYears of MILESTONE_YEARS) {
      const ann = new Date(item.startDate + 'T00:00:00');
      ann.setFullYear(ann.getFullYear() + mYears);
      const rem = Math.round((ann.getTime() - todayMs) / 86400000);
      if (rem > 0 && rem <= 30) {
        chips.push({ type: 'ms', item, rem, years: mYears });
        break;
      }
    }
  }

  for (const item of items.filter(i => !i.endDate)) {
    const days   = calcDays(item.startDate);
    const avg    = getCatAvg(item.category);
    const overYrs = parseFloat((days / 365 - avg).toFixed(1));
    if (overYrs > 0) chips.push({ type: 'od', item, overYrs });
  }

  if (!chips.length) return '';

  chips.sort((a, b) => {
    if (a.type === 'ms' && b.type !== 'ms') return -1;
    if (a.type !== 'ms' && b.type === 'ms') return 1;
    if (a.type === 'ms') return a.rem - b.rem;
    return b.overYrs - a.overYrs;
  });

  const html = chips.map(c => {
    const icon = CAT_ICONS_MS[c.item.category] || '📦';
    return c.type === 'ms'
      ? `<span class="ns-chip ns-ms">🎯 ${icon} <b>${c.item.name}</b> ${c.years}年まで${c.rem === 1 ? '明日！' : `あと${c.rem}日`}</span>`
      : `<span class="ns-chip ns-od">⏰ ${icon} <b>${c.item.name}</b> +${c.overYrs}年</span>`;
  }).join('');

  return `<div class="ns-bar"><div class="ns-scroll">${html}</div></div>`;
}

let _tab             = 'active';
let _filter          = 'all';
let _sort            = 'years_desc';
let _search          = '';
let _searchTriggered = false;

export function getSearch() { return _search; }

const _SS = 'nns_ls';
try {
  const s = JSON.parse(sessionStorage.getItem(_SS) || '{}');
  if (s.tab)                       _tab    = s.tab;
  if (s.filter)                    _filter = s.filter;
  if (s.sort) {
    // 旧値マイグレーション
    _sort = s.sort === 'years' ? 'years_desc' : s.sort === 'cost' ? 'cost_asc' : s.sort;
  }
  if (typeof s.search === 'string') _search = s.search;
} catch {}

function _persist() {
  sessionStorage.setItem(_SS, JSON.stringify({ tab: _tab, filter: _filter, sort: _sort, search: _search }));
}

export function render(items) {
  const active = items.filter(i => !i.endDate);
  const ended  = items.filter(i =>  i.endDate);

  const avgYrs = active.length
    ? active.reduce((s, i) => s + calcDays(i.startDate), 0) / active.length / 365
    : 0;
  const catAvgYrs = active.length
    ? active.reduce((s, i) => s + (getCatAvg(i.category)), 0) / active.length
    : 5;
  const diffYrs = avgYrs - catAvgYrs;
  const { total: totalSavings, count: savingsCount } = calcTotalSavings(active);

  const base = _tab === 'active' ? active : ended;
  const cats = ['all', ...Array.from(new Set(base.map(i => i.category)))];

  let list = _filter === 'all' ? [...base] : base.filter(i => i.category === _filter);
  if (_search) {
    const q = _search.toLowerCase();
    list = list.filter(i => i.name.toLowerCase().includes(q) || (i.memo || '').toLowerCase().includes(q));
  }
  list.sort((a, b) => {
      const da = calcDays(a.startDate, a.endDate);
      const db = calcDays(b.startDate, b.endDate);
      if (_sort === 'years_desc') return db - da;
      if (_sort === 'years_asc')  return da - db;
      if (_sort === 'name_asc')   return a.name.localeCompare(b.name, 'ja');
      if (_sort === 'name_desc')  return b.name.localeCompare(a.name, 'ja');
      if (_sort === 'created_desc') return (b.createdAt || '').localeCompare(a.createdAt || '');
      const ca = hasPrice(a) ? dailyCost(a.actualPrice, da) : (_sort === 'cost_asc' ? Infinity : -Infinity);
      const cb = hasPrice(b) ? dailyCost(b.actualPrice, db) : (_sort === 'cost_asc' ? Infinity : -Infinity);
      if (_sort === 'cost_asc')  return ca - cb;
      if (_sort === 'cost_desc') return cb - ca;
      return 0;
    });

  // 比例バーの基準：現在の表示リスト内の最長日数（最低1年）
  const allDaysInList = list.map(i => calcDays(i.startDate, i.endDate));
  const maxDays = Math.max(...allDaysInList, 365);

  // デモデータ検出（ID '1'〜'19' のどれかがあればデモ中）
  const DEMO_IDS = new Set(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19']);
  const hasDemo = items.some(i => DEMO_IDS.has(i.id));
  const demoBanner = hasDemo ? `
    <div class="demo-banner">
      <span>📦 デモデータ表示中</span>
      <button class="demo-reset-btn" id="btn-reset-demo">リセット</button>
    </div>` : '';

  return `
  <div id="list-view">

    ${demoBanner}

    <div class="summary-card">
      <div class="sc-stat">
        <div class="sc-val">${active.length}</div>
        <div class="sc-lbl">使用中</div>
      </div>
      <div class="sc-sep"></div>
      <div class="sc-stat">
        <div class="sc-val" style="color:${diffYrs>=0?'#16a34a':'#ef4444'}">${avgYrs.toFixed(1)}<small>年</small></div>
        <div class="sc-lbl">平均使用年数</div>
      </div>
      ${totalSavings > 0 ? `
      <div class="sc-sep"></div>
      <div class="sc-stat sc-savings">
        <div class="sc-val sc-savings-val">¥${totalSavings >= 10000 ? Math.round(totalSavings/10000)+'万' : totalSavings.toLocaleString()}</div>
        <div class="sc-lbl">節約中 🎉</div>
      </div>` : ''}
    </div>

    ${buildNoticeStrip(active)}

    <div class="filter-area">
      <div class="tab-pills">
        <button class="tab-pill ${_tab==='active'?'active':''}" data-tab="active">使用中 ${active.length}</button>
        <button class="tab-pill ${_tab==='ended' ?'active':''}" data-tab="ended">終了 ${ended.length}</button>
      </div>
      <div class="filter-area-divider"></div>
      <div class="filter-scroll">
        ${cats.map(c => `<button class="filter-chip ${_filter===c?'active':''}" data-cat="${c}">${c==='all'?'すべて':c}</button>`).join('')}
      </div>
      <select class="sort-select" id="sort-select">
        <option value="years_desc"   ${_sort==='years_desc'   ?'selected':''}>年数↓</option>
        <option value="years_asc"    ${_sort==='years_asc'    ?'selected':''}>年数↑</option>
        <option value="cost_asc"     ${_sort==='cost_asc'     ?'selected':''}>コスト↑</option>
        <option value="cost_desc"    ${_sort==='cost_desc'    ?'selected':''}>コスト↓</option>
        <option value="name_asc"     ${_sort==='name_asc'     ?'selected':''}>名前↑</option>
        <option value="name_desc"    ${_sort==='name_desc'    ?'selected':''}>名前↓</option>
        <option value="created_desc" ${_sort==='created_desc' ?'selected':''}>追加↓</option>
      </select>
    </div>

    <div class="card-list">
      ${list.length
        ? list.map(i => _tab === 'ended' ? endedCard(i, maxDays) : itemCard(i, maxDays)).join('')
        : `<div class="empty-state">
            <p class="empty-icon">${_search ? '🔍' : '📦'}</p>
            <p class="empty-text">${_search ? '該当するアイテムがありません' : 'アイテムがありません'}</p>
            <p class="empty-sub">${_search ? '別のキーワードで試してみましょう' : 'ヘッダーの＋ボタンで追加しよう'}</p>
            ${!_search ? `<button class="btn-try-demo" id="btn-try-demo">📦 デモデータを試す</button>` : ''}
          </div>`
      }
    </div>
  </div>`;
}

function _showQuickSheet(itemId, navigate, quickActions) {
  // 既存シートを除去
  document.getElementById('quick-sheet-overlay')?.remove();
  document.getElementById('quick-sheet')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'quick-sheet-overlay';
  overlay.className = 'quick-sheet-overlay';

  const sheet = document.createElement('div');
  sheet.id = 'quick-sheet';
  sheet.className = 'quick-sheet';
  sheet.innerHTML = `
    <div class="qs-handle"></div>
    <div class="qs-actions">
      <button class="qs-btn" id="qs-duplicate">📋 複製して追加</button>
      <button class="qs-btn" id="qs-end">✅ 使用終了（今日）</button>
      <button class="qs-btn qs-btn-danger" id="qs-delete">🗑 削除</button>
    </div>
    <button class="qs-btn qs-btn-cancel" id="qs-cancel">キャンセル</button>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(sheet);
  requestAnimationFrame(() => { overlay.classList.add('open'); sheet.classList.add('open'); });

  const close = () => {
    overlay.classList.remove('open'); sheet.classList.remove('open');
    setTimeout(() => { overlay.remove(); sheet.remove(); }, 260);
  };

  overlay.addEventListener('click', close);
  document.getElementById('qs-cancel').addEventListener('click', close);
  document.getElementById('qs-duplicate').addEventListener('click', () => {
    close(); navigate('add', { fromId: itemId });
  });
  document.getElementById('qs-end').addEventListener('click', () => {
    close(); quickActions.endUse?.(itemId);
  });
  document.getElementById('qs-delete').addEventListener('click', () => {
    close(); quickActions.deleteItem?.(itemId);
  });
}

function _showSavingsSheet(items) {
  document.getElementById('savings-sheet-ov')?.remove();

  const active = items.filter(i => !i.endDate && i.actualPrice);
  const breakdown = active
    .map(i => {
      const days    = calcDays(i.startDate);
      const avgDays = getCatAvg(i.category) * 365;
      if (days <= avgDays) return null;
      const saved = Math.round(i.actualPrice * (days - avgDays) / avgDays);
      const overYrs = ((days - avgDays) / 365).toFixed(1);
      const usedYrs = (days / 365).toFixed(1);
      return { item: i, saved, overYrs, usedYrs, avg: getCatAvg(i.category) };
    })
    .filter(Boolean)
    .sort((a, b) => b.saved - a.saved);

  const total = breakdown.reduce((s, r) => s + r.saved, 0);
  const CAT_IC = { 'スマホ':'📱','PC':'💻','タブレット':'📟','イヤホン':'🎧','カメラ':'📷','ゲーム機':'🎮','時計':'⌚','バッグ':'🎒','洋服':'👔','家電':'📺','家具':'🪑','自転車':'🚲','楽器':'🎸','車・バイク':'🚗' };

  const rows = breakdown.map(({ item, saved, overYrs, usedYrs, avg }) => `
    <div class="sv-row">
      <span class="sv-icon">${item.icon || CAT_IC[item.category] || '📦'}</span>
      <div class="sv-body">
        <div class="sv-name">${item.name}</div>
        <div class="sv-detail">平均${avg}年 → ${usedYrs}年使用（+${overYrs}年）</div>
      </div>
      <div class="sv-amount">+¥${saved.toLocaleString('ja-JP')}</div>
    </div>`).join('');

  const ov = document.createElement('div');
  ov.id = 'savings-sheet-ov';
  ov.className = 'quick-sheet-overlay';
  const sheet = document.createElement('div');
  sheet.className = 'quick-sheet sv-sheet';
  sheet.innerHTML = `
    <div class="qs-handle"></div>
    <div class="sv-header">
      <div class="sv-total-label">🎉 節約の内訳</div>
      <div class="sv-total">¥${total.toLocaleString('ja-JP')}</div>
      <div class="sv-formula">購入額 × 超過年数 ÷ カテゴリ平均年数</div>
    </div>
    <div class="sv-list">${rows}</div>
    <button class="qs-btn qs-btn-cancel" id="sv-close">閉じる</button>`;

  document.body.appendChild(ov);
  document.body.appendChild(sheet);
  requestAnimationFrame(() => { ov.classList.add('open'); sheet.classList.add('open'); });

  const close = () => {
    ov.classList.remove('open'); sheet.classList.remove('open');
    setTimeout(() => { ov.remove(); sheet.remove(); }, 260);
  };
  ov.addEventListener('click', close);
  sheet.querySelector('#sv-close').addEventListener('click', close);
}

export function init(navigate, openModal, quickActions = {}, items = []) {
  if (_searchTriggered) {
    _searchTriggered = false;
    const input = document.getElementById('search-input');
    if (input) {
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  }

  document.getElementById('search-input')?.addEventListener('input', e => {
    _search = e.target.value; _searchTriggered = true; _persist();
    navigate('list');
  });
  document.getElementById('search-clear')?.addEventListener('click', () => {
    _search = ''; _persist();
    navigate('list');
  });
  document.querySelectorAll('.tab-pill[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      _tab = btn.dataset.tab; _search = ''; _filter = 'all'; _persist();
      navigate('list');
    });
  });
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => { _filter = btn.dataset.cat; _persist(); navigate('list'); });
  });
  document.getElementById('sort-select')?.addEventListener('change', e => {
    _sort = e.target.value; _persist(); navigate('list');
  });
  document.querySelectorAll('.cv2[data-id]').forEach(card => {
    let longPressed = false;
    let timer = null;
    card.addEventListener('touchstart', () => {
      longPressed = false;
      timer = setTimeout(() => {
        longPressed = true;
        card.classList.add('pressing');
        _showQuickSheet(card.dataset.id, navigate, quickActions);
      }, 600);
    }, { passive: true });
    card.addEventListener('touchend',  () => { clearTimeout(timer); card.classList.remove('pressing'); }, { passive: true });
    card.addEventListener('touchmove', () => { clearTimeout(timer); card.classList.remove('pressing'); }, { passive: true });
    card.addEventListener('click', e => {
      if (longPressed) { longPressed = false; return; }
      if (e.target.closest('.cv2-reg')) return;
      openModal(card.dataset.id);
    });
  });
  document.querySelectorAll('.cv2-reg[data-id]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      navigate('edit', { id: el.dataset.id });
    });
  });

  document.querySelector('.sc-savings')?.addEventListener('click', () => {
    _showSavingsSheet(items);
  });
}
