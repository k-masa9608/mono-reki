import { CATEGORIES, calcDays, fmtYearsDecimal, fmtCurrency, genId, today } from '../utils.js';

const CAT_ICONS = {
  'スマホ':'📱','PC':'💻','タブレット':'📟','イヤホン':'🎧','カメラ':'📷','ゲーム機':'🎮',
  '時計':'⌚','バッグ':'🎒','洋服':'👔','家電':'📺','家具':'🪑','自転車':'🚲','楽器':'🎸','車・バイク':'🚗',
};

// ── 同カテゴリのアクティブアイテムとの比較 ──
function buildComparison(wish, activeItems) {
  const same = activeItems.filter(i => i.category === wish.category);
  if (!same.length) return '';

  const rows = same.map(item => {
    const days    = calcDays(item.startDate);
    const avg     = CATEGORIES[item.category] || 5;
    const over    = days / 365 >= avg;
    const usedY   = fmtYearsDecimal(days);
    const icon    = item.icon || CAT_ICONS[item.category] || '📦';
    const badge   = over
      ? `<span class="wl-replace-badge">買い替えタイミング</span>`
      : `<span class="wl-using-badge">使用中 ${usedY}年 / 平均${avg}年</span>`;
    return `
    <div class="wl-cmp-row">
      <span class="wl-cmp-icon">${icon}</span>
      <span class="wl-cmp-name">${item.name}</span>
      ${badge}
    </div>`;
  }).join('');

  return `<div class="wl-cmp">${rows}</div>`;
}

// ── 1件カード ──
function wishCard(wish, activeItems) {
  const icon        = wish.icon || CAT_ICONS[wish.category] || '📦';
  const priceHtml   = wish.targetPrice
    ? `<span class="wl-price">${fmtCurrency(wish.targetPrice)}</span>`
    : '';
  const priorityMeta = { high: { label: '優先度高', color: '#ef4444' }, medium: { label: '優先度中', color: '#f97316' }, low: { label: '優先度低', color: '#94a3b8' } };
  const pm = priorityMeta[wish.priority || 'medium'];

  return `
  <div class="wl-card" data-id="${wish.id}">
    <div class="wl-card-top">
      <span class="wl-icon">${icon}</span>
      <div class="wl-card-body">
        <div class="wl-card-name">${wish.name}</div>
        <div class="wl-card-meta">
          <span class="wl-cat">${wish.category}</span>
          ${priceHtml}
          <span class="wl-priority" style="color:${pm.color}">${pm.label}</span>
        </div>
        ${wish.memo ? `<div class="wl-memo">${wish.memo}</div>` : ''}
      </div>
      <button class="wl-delete-btn" data-del="${wish.id}" aria-label="削除">✕</button>
    </div>
    ${buildComparison(wish, activeItems)}
    <div class="wl-card-actions">
      <button class="wl-buy-btn" data-buy="${wish.id}">✓ 購入した → 登録</button>
    </div>
  </div>`;
}

// ── render ──
export function render(allItems) {
  const wishItems  = allItems.filter(i => i.wishlist);
  const activeItems = allItems.filter(i => !i.wishlist && !i.endDate);

  const cardsHtml = wishItems.length
    ? wishItems.map(w => wishCard(w, activeItems)).join('')
    : `<div class="empty-state">
        <p class="empty-icon">🛒</p>
        <p class="empty-text">欲しいものリストは空です</p>
        <p class="empty-sub">「＋」ボタンで気になるアイテムを登録しよう</p>
      </div>`;

  return `
  <div id="wishlist-view">
    <div class="wl-list">${cardsHtml}</div>
  </div>`;
}

// ── init ──
export function init(allItems, navigate, onDelete, onBuy) {
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      onDelete(btn.dataset.del);
    });
  });
  document.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => onBuy(btn.dataset.buy));
  });
}

// ── フォームモーダル ──
export function renderAddForm() {
  const cats = Object.keys(CATEGORIES);
  const catBtns = cats.map(c =>
    `<button type="button" class="cat-chip" data-cat="${c}">
      <span class="cat-chip-name">${c}</span>
    </button>`
  ).join('');

  return `
  <form id="wl-form" class="form" style="padding:0">
    <div class="form-group">
      <label class="form-label" for="wl-name">商品名</label>
      <input class="form-input form-input-lg" id="wl-name" type="text" placeholder="例：iPhone 17" autocomplete="off" required>
    </div>
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">カテゴリ</label>
      <input type="hidden" id="wl-cat" value="${cats[0]}">
      <div class="cat-grid">${catBtns}</div>
    </div>
    <div class="form-group" style="margin-top:12px">
      <label class="form-label" for="wl-price">予算</label>
      <div class="input-prefix">
        <span class="prefix">¥</span>
        <input class="form-input with-prefix" id="wl-price" type="number" inputmode="numeric" min="0" placeholder="任意">
      </div>
    </div>
    <div class="form-group" style="margin-top:10px">
      <label class="form-label">優先度</label>
      <div class="wl-priority-row">
        <button type="button" class="wl-pri-btn active" data-pri="high">高</button>
        <button type="button" class="wl-pri-btn" data-pri="medium">中</button>
        <button type="button" class="wl-pri-btn" data-pri="low">低</button>
      </div>
      <input type="hidden" id="wl-priority" value="high">
    </div>
    <div class="form-group" style="margin-top:10px">
      <label class="form-label" for="wl-memo">メモ</label>
      <input class="form-input" id="wl-memo" type="text" placeholder="気になる点・モデル名など" autocomplete="off">
    </div>
    <div class="form-actions" style="padding:8px 0 0">
      <button type="button" class="btn-secondary" id="wl-cancel">キャンセル</button>
      <button type="submit" class="btn-primary">追加する</button>
    </div>
  </form>`;
}

export function initAddForm(onSave, onCancel) {
  // カテゴリ選択
  let selectedCat = Object.keys(CATEGORIES)[0];
  document.querySelectorAll('#wl-form .cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#wl-form .cat-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCat = btn.dataset.cat;
      document.getElementById('wl-cat').value = selectedCat;
    });
  });
  // 最初の1個をアクティブに
  document.querySelector('#wl-form .cat-chip')?.classList.add('active');

  // 優先度ボタン
  document.querySelectorAll('.wl-pri-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wl-pri-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('wl-priority').value = btn.dataset.pri;
    });
  });

  document.getElementById('wl-cancel')?.addEventListener('click', onCancel);

  document.getElementById('wl-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('wl-name').value.trim();
    if (!name) return;
    const now = new Date().toISOString();
    onSave({
      id:          genId(),
      wishlist:    true,
      name,
      category:    document.getElementById('wl-cat').value || selectedCat,
      targetPrice: parseFloat(document.getElementById('wl-price').value) || null,
      priority:    document.getElementById('wl-priority').value || 'medium',
      memo:        document.getElementById('wl-memo').value.trim() || '',
      createdAt:   now,
      updatedAt:   now,
    });
  });
}
