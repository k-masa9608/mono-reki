import { RANK_META, calcDays, getRank, dailyCost, hasPrice,
         fmtYearsDecimal, fmtCurrency, fmtDate, getCatAvg } from '../utils.js';

let _tab = 'years';

export function render(items) {
  const active = items.filter(i => !i.endDate);
  const priced = active.filter(i => hasPrice(i));

  const totalSaved = items.reduce((s, i) => {
    if (!hasPrice(i)) return s;
    return s + Math.max(0, (i.listPrice || i.actualPrice) - i.actualPrice);
  }, 0);

  const byYears = [...active].sort((a, b) => calcDays(b.startDate) - calcDays(a.startDate));
  const byCost  = [...priced].sort((a, b) => {
    const da = calcDays(a.startDate), db = calcDays(b.startDate);
    return (a.actualPrice/da) - (b.actualPrice/db);
  });
  const list = _tab === 'years' ? byYears : byCost;

  const medals = ['🥇','🥈','🥉','4位','5位','6位','7位','8位','9位','10位'];

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

    <div class="tab-bar" style="padding:0 10px 8px">
      <button class="tab-btn ${_tab==='years'?'active':''}" data-rtab="years">使用年数が長い順</button>
      <button class="tab-btn ${_tab==='cost' ?'active':''}" data-rtab="cost">1日コストが安い順</button>
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
        const color = meta ? meta.border : '#cbd5e1';
        const glow  = rank === 'SS' ? ' ss-glow' : '';

        const badge = priced && meta
          ? `<span class="rank-badge${glow}" style="background:${meta.bg};color:${meta.text}">${rank}</span>`
          : `<span class="rank-badge-none">—</span>`;

        const mainVal = _tab === 'years'
          ? `${fmtYearsDecimal(days)}年`
          : fmtCurrency(Math.round(cost));

        return `
        <div class="rank-row ${i===0?'gold':''}" data-id="${item.id}"
             style="border-left-color:${color}">
          <div class="rank-pos">${medals[i] || `${i+1}位`}</div>
          <div class="rank-row-info">
            <div class="rank-row-name">${item.name}</div>
            <div class="rank-row-sub">${item.category} · ${fmtDate(item.startDate)}</div>
          </div>
          ${badge}
          <div class="rank-row-right">
            <span class="rank-row-val" style="color:${color}">${mainVal}</span>
            <span class="rank-row-unit">${_tab==='years'?'使用中':'/日'}</span>
          </div>
        </div>`;
      }).join('') : `<div class="empty-state">
        <p class="empty-icon">🏆</p>
        <p class="empty-text">まだアイテムがありません</p>
      </div>`}
    </div>
  </div>`;
}

export function init(navigate) {
  document.querySelectorAll('[data-rtab]').forEach(btn => {
    btn.addEventListener('click', () => { _tab = btn.dataset.rtab; navigate('ranking'); });
  });
  document.querySelectorAll('.rank-row[data-id]').forEach(row => {
    row.addEventListener('click', () => navigate('detail', { id: row.dataset.id }));
  });
}
