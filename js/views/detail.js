import { CATEGORIES, calcDays, dailyCost, hasPrice,
         fmtYears, fmtYearsDecimal, fmtCurrency, fmtDate, getMilestone } from '../utils.js';

// ── 視覚タイムライン ──
function buildTimeline(item, days, avg) {
  const usedYrs = days / 365;
  const over    = usedYrs >= avg;
  const color   = item.endDate ? '#94a3b8' : over ? '#22c55e' : '#3b82f6';

  const nodes = [];

  // 購入日（使用開始と異なる場合のみ）
  if (item.purchaseDate && item.purchaseDate !== item.startDate) {
    nodes.push({ label: '購入', sub: fmtDate(item.purchaseDate), past: true });
  }

  // 使用開始
  nodes.push({ label: '開始', sub: fmtDate(item.startDate), past: true });

  // 経過済みマイルストーン（1/3/5/7/10年）
  const MS_YEARS = [1, 3, 5, 7, 10];
  for (const y of MS_YEARS) {
    if (usedYrs >= y) {
      const ann = new Date(item.startDate + 'T00:00:00');
      ann.setFullYear(ann.getFullYear() + y);
      nodes.push({ label: `${y}年`, sub: `${ann.getFullYear()}.${String(ann.getMonth()+1).padStart(2,'0')}`, past: true });
    }
  }

  // 現在 or 終了
  nodes.push({
    label: item.endDate ? '終了' : '現在',
    sub: item.endDate ? fmtDate(item.endDate) : `${usedYrs.toFixed(1)}年`,
    current: true,
    color,
  });

  const nodeHtml = nodes.map((n, i) => `
    <div class="tl-node${n.current ? ' tl-current' : ''}">
      ${i > 0 ? `<div class="tl-line${n.current ? ' tl-line-active' : ''}" style="${n.current?`background:${color}`:''}"></div>` : ''}
      <div class="tl-dot${n.current ? ' tl-dot-current' : ''}" style="${n.current?`background:${color};border-color:${color}`:''}"></div>
      <div class="tl-label">${n.label}</div>
      <div class="tl-sub">${n.sub}</div>
    </div>`).join('');

  return `<div class="tl-wrap"><div class="tl-row">${nodeHtml}</div></div>`;
}

// ── 1日コスト推移（ランク記号なし）──
function costTimeline(actualPrice, days, avg) {
  if (!actualPrice) return '';
  const avgDays = Math.round(avg * 365);
  const pts = [
    { label: '1ヶ月', days: 30 },
    { label: '6ヶ月', days: 180 },
    { label: '1年',   days: 365 },
    { label: '現在',  days, isCurrent: true },
    { label: `${avg}年\n(平均)`, days: avgDays },
  ];
  const seen = new Set();
  const sorted = pts
    .sort((a, b) => a.days - b.days)
    .filter(p => { if (seen.has(p.days)) return false; seen.add(p.days); return true; });

  return `
  <div class="cost-timeline">
    ${sorted.map(p => `
      <div class="cost-tl-item${p.isCurrent?' current':''}">
        <div class="cost-tl-label">${p.label.replace('\n','<br>')}</div>
        <div class="cost-tl-val">¥${Math.round(actualPrice / p.days).toLocaleString()}</div>
        <div class="cost-tl-unit">/日</div>
      </div>`).join('')}
  </div>`;
}

// ── 世代チェーン ──
function chainSection(item, allItems) {
  const prevItem = item.prevItemId ? allItems.find(i => i.id === item.prevItemId) : null;
  const nextItem = allItems.find(i => i.prevItemId === item.id);
  if (!prevItem && !nextItem) return '';

  const node = (it, role) => {
    const d = calcDays(it.startDate, it.endDate);
    const meta = it.endDate ? `${(d/365).toFixed(1)}年使用` : '使用中';
    return `<div class="chain-node chain-${role}" data-chain-id="${it.id}">
      <div class="chain-node-name">${it.name}</div>
      <div class="chain-node-meta">${meta}</div>
    </div>`;
  };

  const arr = '<div class="chain-arr">→</div>';
  const nodes = [
    ...(prevItem ? [node(prevItem, 'past'), arr] : []),
    node(item, 'cur'),
    ...(nextItem ? [arr, node(nextItem, nextItem.endDate ? 'past' : 'next')] : []),
  ].join('');

  // 自分のカテゴリ内での平均交換サイクル
  const chained = allItems.filter(i => i.category === item.category && i.prevItemId);
  let cycleHtml = '';
  if (chained.length) {
    const totalDays = chained.reduce((s, i) => {
      const prev = allItems.find(p => p.id === i.prevItemId);
      return prev ? s + calcDays(prev.startDate, prev.endDate) : s;
    }, 0);
    const avgYrs = (totalDays / chained.length / 365).toFixed(1);
    cycleHtml = `<div class="chain-cycle">あなたの${item.category}交換サイクル：平均 <strong>${avgYrs}年</strong></div>`;
  }

  return `
  <div class="modal-section">
    <div class="modal-sec-title">世代チェーン</div>
    <div class="chain-wrap">${nodes}</div>
    ${cycleHtml}
  </div>`;
}

// ── モーダル用レンダラー ──
export function renderModal(item, allItems = []) {
  const days   = calcDays(item.startDate, item.endDate);
  const cost   = dailyCost(item.actualPrice, days);
  const avg    = CATEGORIES[item.category] || 5;
  const over   = days >= avg * 365;
  const ended  = !!item.endDate;
  const priced = hasPrice(item);
  const ms     = getMilestone(days);

  const yearColor = ended ? '#94a3b8' : over ? '#22c55e' : '#3b82f6';

  const savingsLine = (priced && over)
    ? (() => { const reps = Math.floor(days / (avg * 365)); return reps >= 1
        ? `<div class="mc-savings">🎉 平均${avg}年買い替えなら今頃<strong>${reps+1}代目</strong>・<strong>${fmtCurrency(reps * item.actualPrice)}</strong>節約</div>`
        : ''; })()
    : '';

  const infoRows = [
    item.purchaseDate ? ['購入日', fmtDate(item.purchaseDate)] : null,
    ['使用開始', fmtDate(item.startDate)],
    item.actualPrice  ? ['購入額', fmtCurrency(item.actualPrice)] : null,
    priced            ? ['1日コスト', `<span style="color:${yearColor};font-weight:800">${fmtCurrency(Math.round(cost))}/日</span>`] : null,
    item.purchasePlace ? ['購入場所', item.purchasePlace] : null,
    ended && item.disposalReason ? ['手放した理由', item.disposalReason] : null,
    item.memo ? ['メモ', item.memo] : null,
  ].filter(Boolean).map(([k, v]) =>
    `<div class="mc-row"><span class="mc-key">${k}</span><span class="mc-val">${v}</span></div>`
  ).join('');

  return `
  <div class="modal-compact">
    ${item.photo ? `<img src="${item.photo}" alt="" class="modal-photo">` : ''}

    <div class="mc-hero">
      <span class="mc-years" style="color:${yearColor}">${fmtYearsDecimal(days)}<small>年</small></span>
      <span class="mc-days">${days.toLocaleString()}日${ended ? '（終了）' : '使用中'}</span>
      ${item.usageFreq ? `<span class="mc-freq">${item.usageFreq}</span>` : ''}
      ${ms && !ended ? `<span class="mc-ms" style="color:${ms.color}">${ms.emoji} ${ms.label}</span>` : ''}
    </div>

    ${buildTimeline(item, days, avg)}

    <div class="mc-info">${infoRows}</div>

    ${savingsLine}

    ${!priced ? `<button class="modal-reg-btn" id="modal-reg-price">¥ 購入金額を登録する →</button>` : ''}

    <div class="mc-actions">
      <button class="mc-share-btn" id="modal-share-btn">🔗 シェア</button>
      <button class="mc-delete-btn" id="modal-delete-btn">削除</button>
    </div>
  </div>`;
}

export function initModal(item, navigate, closeModal, deleteItem, openModal = null) {
  document.getElementById('modal-delete-btn')?.addEventListener('click', async () => {
    if (confirm(`「${item.name}」を削除しますか？`)) {
      await deleteItem(item.id);
    }
  });
  document.getElementById('modal-reg-price')?.addEventListener('click', () => {
    closeModal();
    navigate('edit', { id: item.id });
  });
  document.getElementById('modal-share-btn')?.addEventListener('click', async () => {
    const days = calcDays(item.startDate, item.endDate);
    const yrs  = fmtYearsDecimal(days);
    const text = `「${item.name}」を${yrs}年使っています！ #モノ歴`;
    if (navigator.share) {
      try { await navigator.share({ title: 'モノ歴', text }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById('modal-share-btn');
        if (btn) { btn.textContent = '✓ コピーしました'; setTimeout(() => { btn.textContent = '🔗 シェア'; }, 2000); }
      } catch {}
    }
  });
  // チェーンノードをタップで別アイテムのモーダルを開く
  if (openModal) {
    document.querySelectorAll('[data-chain-id]').forEach(node => {
      node.addEventListener('click', () => {
        closeModal();
        setTimeout(() => openModal(node.dataset.chainId), 320);
      });
    });
  }
}

// ── フルページ detail（hash routing fallback 用、実質未使用）──
export function render(item) {
  return renderModal(item);
}
export function init(item, navigate, deleteItem) {
  initModal(item, navigate, () => {}, deleteItem);
}
