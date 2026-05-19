import { CATEGORIES, CATEGORY_GROUPS, calcDays, dailyCost, hasPrice,
         fmtCurrency, getMilestone } from '../utils.js';

const CAT_ICONS = {
  'スマホ':'📱','PC':'💻','タブレット':'📟','イヤホン':'🎧',
  'カメラ':'📷','ゲーム機':'🎮','時計':'⌚','バッグ':'🎒',
  '洋服':'👔','家電':'📺','家具':'🪑','自転車':'🚲','楽器':'🎸','車・バイク':'🚗',
};

const PRICE_PRESETS  = [30000, 50000, 80000, 100000, 130000, 160000, 200000, 300000];
const YEAR_QUICK     = [1, 2, 3, 5, 7, 10];
const MILESTONE_YEARS = [1, 3, 5, 7, 10];

let _state = {
  category:    Object.keys(CATEGORIES)[0],
  price:       100000,
  years:       3,
  customPrice: '',
};

function calcResultHTML() {
  const days    = Math.round(_state.years * 365);
  const cost    = _state.price / days;
  const avg     = CATEGORIES[_state.category] || 5;
  const color   = cost < 10 ? '#22c55e' : cost < 30 ? '#16a34a' : cost < 100 ? '#3b82f6' : cost < 300 ? '#f97316' : '#ef4444';
  const label   = cost < 10 ? '超優秀' : cost < 30 ? '優秀' : cost < 100 ? '良好' : cost < 300 ? '普通' : '要改善';

  const milestones = MILESTONE_YEARS.map(y => {
    const d  = y * 365;
    const c  = Math.round(_state.price / d);
    const ms = getMilestone(d);
    return `
    <div class="sim-ms-card${y >= avg ? ' over' : ''}">
      <div class="sim-ms-emoji">${ms ? ms.emoji : '📅'}</div>
      <div class="sim-ms-year">${y}年</div>
      <div class="sim-ms-cost" style="color:${ms ? ms.color : '#64748b'}">¥${c.toLocaleString()}<span>/日</span></div>
      ${y >= avg ? `<div class="sim-ms-avg">平均超え</div>` : ''}
    </div>`;
  }).join('');

  return `
  <div class="sim-fixed-inner">
    <div class="sim-fixed-main">
      <div>
        <div class="sim-cost-big" style="color:${color}">${fmtCurrency(Math.round(cost))}<span>/日</span></div>
        <div class="sim-days">${_state.years}年使用（${days.toLocaleString()}日）· <span style="color:${color};font-weight:700">${label}</span></div>
      </div>
    </div>
    <div class="sim-ms-row">${milestones}</div>
  </div>`;
}

function ownedComparisonHTML(allItems) {
  const cat    = _state.category;
  const active = allItems.filter(i => !i.endDate && i.category === cat);
  const past   = allItems.filter(i =>  i.endDate && i.category === cat);
  if (!active.length && !past.length) return '';

  const rows = [
    ...active.map(i => {
      const d = calcDays(i.startDate);
      const c = hasPrice(i) ? `${fmtCurrency(Math.round(dailyCost(i.actualPrice, d)))}/日` : '価格未登録';
      return `<div class="comp-row"><span class="comp-name">${i.name}</span><span class="comp-meta">${(d/365).toFixed(1)}年使用中 · ${c}</span></div>`;
    }),
    ...past.map(i => {
      const d = calcDays(i.startDate, i.endDate);
      const c = hasPrice(i) ? `${fmtCurrency(Math.round(dailyCost(i.actualPrice, d)))}/日` : '価格未登録';
      return `<div class="comp-row ended"><span class="comp-name">${i.name}</span><span class="comp-meta">${(d/365).toFixed(1)}年使用済 · ${c}</span></div>`;
    }),
  ].join('');

  return `
  <div class="section" style="margin-top:0">
    <div class="section-title">📊 ${cat}の所有実績</div>
    ${rows}
  </div>`;
}

export function render(allItems) {
  const avg = CATEGORIES[_state.category] || 5;

  return `
  <div id="simulator-view">
    <div class="sim-scroll">

      <div class="sim-compact-section">
        <div class="sim-label">カテゴリ</div>
        <div class="cat-grid" style="margin-top:4px">
          ${CATEGORY_GROUPS.map(g => `
            <div class="cat-group-row">
              <span class="cat-group-lbl">${g.label}</span>
              <div class="cat-chip-row">
                ${g.cats.map(c => `
                  <button class="cat-chip sim-cat-btn${_state.category===c?' active':''}" data-cat="${c}">
                    <span class="cat-chip-icon">${CAT_ICONS[c]||'📦'}</span>
                    <span class="cat-chip-name">${c}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="avg-badge" style="margin-top:6px">📊 ${_state.category}の平均寿命：<strong>${avg}年</strong></div>
      </div>

      <div class="sim-compact-section">
        <div class="sim-label">購入予定額</div>
        <div class="price-presets-scroll">
          ${PRICE_PRESETS.map(p =>
            `<button class="price-btn ${_state.price===p&&!_state.customPrice?'active':''}" data-price="${p}">¥${(p/10000).toFixed(0)}万</button>`
          ).join('')}
        </div>
        <div class="input-prefix" style="margin-top:6px">
          <span class="prefix">¥</span>
          <input class="form-input with-prefix" id="sim-price-input" type="number" min="1" step="1000"
                 value="${_state.customPrice||''}" placeholder="自由入力">
        </div>
      </div>

      <div class="sim-compact-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div class="sim-label" style="margin-bottom:0">使用予定年数</div>
          <span class="year-slider-val">${_state.years}年</span>
        </div>
        <div class="year-quick">
          ${YEAR_QUICK.map(y =>
            `<button class="year-btn ${_state.years===y?'active':''}" data-year="${y}">${y}年</button>`
          ).join('')}
        </div>
        <input class="year-slider" id="sim-slider" type="range" min="0.5" max="15" step="0.5" value="${_state.years}">
        <div class="year-slider-hints"><span>0.5年</span><span style="color:#3b82f6">平均 ${avg}年</span><span>15年</span></div>
      </div>

      <div id="sim-comparison">${ownedComparisonHTML(allItems)}</div>

    </div>

    <!-- 画面下部固定の結果パネル -->
    <div class="sim-fixed-result" id="sim-result-wrap">
      ${calcResultHTML()}
    </div>
  </div>`;
}

function refresh(allItems) {
  const wrap = document.getElementById('sim-result-wrap');
  if (wrap) wrap.innerHTML = calcResultHTML();
  const comp = document.getElementById('sim-comparison');
  if (comp) comp.innerHTML = ownedComparisonHTML(allItems);
}

export function init(allItems, navigate) {
  document.querySelectorAll('.sim-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => { _state.category = btn.dataset.cat; navigate('simulator'); });
  });

  document.querySelectorAll('.price-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _state.price       = parseInt(btn.dataset.price);
      _state.customPrice = '';
      document.getElementById('sim-price-input').value = '';
      document.querySelectorAll('.price-btn').forEach(b => b.classList.toggle('active', b === btn));
      refresh(allItems);
    });
  });

  document.getElementById('sim-price-input')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    if (v > 0) {
      _state.price = v; _state.customPrice = e.target.value;
      document.querySelectorAll('.price-btn').forEach(b => b.classList.remove('active'));
      refresh(allItems);
    }
  });

  document.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _state.years = parseFloat(btn.dataset.year);
      document.getElementById('sim-slider').value = _state.years;
      document.querySelectorAll('.year-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelector('.year-slider-val').textContent = `${_state.years}年`;
      refresh(allItems);
    });
  });

  document.getElementById('sim-slider')?.addEventListener('input', e => {
    _state.years = parseFloat(e.target.value);
    document.querySelector('.year-slider-val').textContent = `${_state.years}年`;
    document.querySelectorAll('.year-btn').forEach(b =>
      b.classList.toggle('active', parseFloat(b.dataset.year) === _state.years)
    );
    refresh(allItems);
  });
}
