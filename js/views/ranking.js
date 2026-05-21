import { RANK_META, calcDays, getRank, dailyCost, hasPrice,
         fmtYearsDecimal, fmtCurrency, fmtDate, getCatAvg } from '../utils.js';

let _tab    = 'years';
let _filter = 'all'; // 'all' | 'active' | 'ended'

export function render(items) {
  const totalSaved = items.reduce((s, i) => {
    if (!hasPrice(i)) return s;
    return s + Math.max(0, (i.listPrice || i.actualPrice) - i.actualPrice);
  }, 0);

  // フィルタ適用
  const filtered = _filter === 'active' ? items.filter(i => !i.endDate)
                 : _filter === 'ended'  ? items.filter(i =>  i.endDate)
                 : items;

  const byYears = [...filtered].sort((a, b) =>
    calcDays(b.startDate, b.endDate) - calcDays(a.startDate, a.endDate));
  const byCost  = [...filtered].filter(i => hasPrice(i)).sort((a, b) => {
    const da = calcDays(a.startDate, a.endDate), db = calcDays(b.startDate, b.endDate);
    return (a.actualPrice / da) - (b.actualPrice / db);
  });
  const list = _tab === 'years' ? byYears : byCost;

  const medals = ['🥇','🥈','🥉','4位','5位','6位','7位','8位','9位','10位'];
  const filterBtns = [['all','全て'],['active','使用中'],['ended','終了済']]
    .map(([v,l])=>`<button class="tl-sort-btn${_filter===v?' active':''}${v==='ended'?' rk-ended-btn':''}" data-rfil="${v}">${l}</button>`).join('');

  return `
  <div id="ranking-view">

    ${totalSaved > 0 ? `
    <div class="savings-banner">
      <span class="savings-icon">💰</span>
      <div>
        <div class="savings-val">¥${totalSaved.toLocaleString('ja-JP')}</div>
        <div class="savings-label">総節約額（定価合計 - 実質購入額合計）</div>
      </div>
    </div>` : ''}

    <div class="rk-controls">
      <div class="tl-sort-row">${filterBtns}</div>
      <div class="tab-bar rk-tab-bar">
        <button class="tab-btn ${_tab==='years'?'active':''}" data-rtab="years">年数順</button>
        <button class="tab-btn ${_tab==='cost' ?'active':''}" data-rtab="cost">コスト順</button>
      </div>
    </div>

    <div class="ranking-list">
      ${list.length ? list.map((item, i) => {
        const days   = calcDays(item.startDate, item.endDate);
        const cost   = dailyCost(item.actualPrice, days);
        const avg    = getCatAvg(item.category);
        const ratio  = days / (avg * 365);
        const rank   = getRank(ratio);
        const priced = hasPrice(item);
        const meta   = rank ? RANK_META[rank] : null;
        const color  = meta ? meta.border : '#cbd5e1';
        const glow   = rank === 'SS' ? ' ss-glow' : '';
        const ended  = !!item.endDate;

        const badge = priced && meta
          ? `<span class="rank-badge${glow}" style="background:${meta.bg};color:${meta.text}">${rank}</span>`
          : `<span class="rank-badge-none">—</span>`;

        const mainVal = _tab === 'years'
          ? `${fmtYearsDecimal(days)}年`
          : fmtCurrency(Math.round(cost));
        const unitLabel = _tab === 'years'
          ? (ended ? '終了済' : '使用中')
          : '/日';

        return `
        <div class="rank-row ${i===0&&!ended?'gold':''}${ended?' rank-row--ended':''}" data-id="${item.id}"
             style="border-left-color:${color}">
          <div class="rank-pos">${medals[i] || `${i+1}位`}</div>
          <div class="rank-row-info">
            <div class="rank-row-name">${item.name}${ended?'<span class="rk-ended-tag">終了</span>':''}</div>
            <div class="rank-row-sub">${item.category} · ${fmtDate(item.startDate)}</div>
          </div>
          ${badge}
          <div class="rank-row-right">
            <span class="rank-row-val" style="color:${color}">${mainVal}</span>
            <span class="rank-row-unit">${unitLabel}</span>
          </div>
        </div>`;
      }).join('') : `<div class="empty-state">
        <p class="empty-icon">🏆</p>
        <p class="empty-text">アイテムがありません</p>
      </div>`}
    </div>
  </div>`;
}

export function init(navigate) {
  document.querySelectorAll('[data-rtab]').forEach(btn => {
    btn.addEventListener('click', () => { _tab = btn.dataset.rtab; navigate('ranking'); });
  });
  document.querySelectorAll('[data-rfil]').forEach(btn => {
    btn.addEventListener('click', () => { _filter = btn.dataset.rfil; navigate('ranking'); });
  });
  document.querySelectorAll('.rank-row[data-id]').forEach(row => {
    row.addEventListener('click', () => navigate('detail', { id: row.dataset.id }));
  });
}
