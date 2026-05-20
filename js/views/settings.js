import { DB } from '../db.js';
import { today, CATEGORIES, calcDays, dailyCost, hasPrice, fmtCurrency } from '../utils.js';

function buildStats(items) {
  if (!items.length) return '';
  const active = items.filter(i => !i.endDate);
  const priced = items.filter(i => hasPrice(i));
  const totalSpend = priced.reduce((s, i) => s + i.actualPrice, 0);
  const avgDailyCost = priced.length
    ? priced.reduce((s, i) => s + (dailyCost(i.actualPrice, calcDays(i.startDate, i.endDate)) || 0), 0) / priced.length
    : null;

  const statCards = `
    <div class="st-stat-grid">
      <div class="st-stat-card">
        <div class="st-stat-val">${active.length}</div>
        <div class="st-stat-lbl">使用中</div>
      </div>
      <div class="st-stat-card">
        <div class="st-stat-val">${items.length}</div>
        <div class="st-stat-lbl">総アイテム</div>
      </div>
      ${totalSpend > 0 ? `
      <div class="st-stat-card st-stat-card-wide">
        <div class="st-stat-val">¥${totalSpend >= 10000 ? Math.round(totalSpend / 10000) + '万' : totalSpend.toLocaleString()}</div>
        <div class="st-stat-lbl">総投資額（登録分）</div>
      </div>` : ''}
      ${avgDailyCost ? `
      <div class="st-stat-card st-stat-card-wide">
        <div class="st-stat-val">¥${Math.round(avgDailyCost)}<small style="font-family:var(--font-ui);font-size:12px">/日</small></div>
        <div class="st-stat-lbl">平均1日コスト</div>
      </div>` : ''}
    </div>`;

  const bycat = {};
  for (const item of items) {
    if (!bycat[item.category]) bycat[item.category] = { count: 0, spend: 0 };
    bycat[item.category].count++;
    if (hasPrice(item)) bycat[item.category].spend += item.actualPrice;
  }
  const rows = Object.entries(bycat)
    .sort((a, b) => b[1].spend - a[1].spend)
    .map(([cat, s]) => `
      <div class="st-cat-row">
        <span class="st-cat-name">${cat}</span>
        <span class="st-cat-count">${s.count}個</span>
        <span class="st-cat-spend">${s.spend ? fmtCurrency(s.spend) : '—'}</span>
      </div>`).join('');

  return `
  <div class="section" style="margin-top:10px">
    <div class="section-title">📊 サマリー</div>
    ${statCards}
    <div class="st-cat-list" style="margin-top:12px">${rows}</div>
  </div>`;
}

export function render(items = []) {
  return `
  <div id="settings-view" style="padding:10px 0 40px">

    ${buildStats(items)}

    <div class="section" style="margin-top:10px">
      <div class="section-title">💾 データ管理</div>
      <div class="settings-group">
        <div class="settings-row">
          <div class="settings-row-body">
            <div class="settings-row-label">JSONで書き出す</div>
            <div class="settings-row-sub">全アイテムをファイルに保存します</div>
          </div>
          <button class="settings-btn" id="btn-export">書き出す</button>
        </div>
        <div class="settings-divider"></div>
        <div class="settings-row">
          <div class="settings-row-body">
            <div class="settings-row-label">JSONから読み込む</div>
            <div class="settings-row-sub">同じIDは上書き、新規IDは追加します</div>
          </div>
          <button class="settings-btn" id="btn-import-trigger">読み込む</button>
        </div>
        <input type="file" id="import-file" accept=".json" style="display:none">
      </div>
    </div>

    <div class="section" style="margin-top:10px">
      <div class="section-title">🎨 テーマ</div>
      <div class="settings-group">
        <div class="settings-row">
          <div class="settings-row-body">
            <div class="settings-row-label">ダークモード</div>
          </div>
          <button class="theme-toggle" id="btn-theme">
            <span id="theme-icon">${typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙'}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">🗑 データリセット</div>
      <div class="settings-group">
        <div class="settings-row">
          <div class="settings-row-body">
            <div class="settings-row-label" style="color:#ef4444">全データを削除</div>
            <div class="settings-row-sub">この操作は元に戻せません</div>
          </div>
          <button class="settings-btn danger" id="btn-clear">削除</button>
        </div>
      </div>
    </div>

    <div id="import-result" style="margin:0 10px"></div>

  </div>`;
}

export function init(navigate) {
  document.getElementById('btn-theme')?.addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('mono_theme', next);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  document.getElementById('btn-export')?.addEventListener('click', async () => {
    const items = await DB.getAll();
    const json  = JSON.stringify(items, null, 2);
    const blob  = new Blob([json], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = Object.assign(document.createElement('a'), {
      href: url, download: `nannenshita_${today()}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import-trigger')?.addEventListener('click', () => {
    document.getElementById('import-file')?.click();
  });

  document.getElementById('import-file')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text  = await file.text();
      const items = JSON.parse(text);
      if (!Array.isArray(items)) throw new Error('配列ではありません');
      for (const item of items) await DB.put(item);
      showResult(`✅ ${items.length}件を読み込みました`, false);
    } catch (err) {
      showResult(`❌ 読み込み失敗: ${err.message}`, true);
    }
    e.target.value = '';
  });

  document.getElementById('btn-clear')?.addEventListener('click', async () => {
    if (!confirm('全データを削除しますか？この操作は元に戻せません。')) return;
    const items = await DB.getAll();
    for (const item of items) await DB.delete(item.id);
    localStorage.removeItem('nannenshita_seeded');
    navigate('list');
  });
}

function showResult(msg, isError) {
  const el = document.getElementById('import-result');
  if (!el) return;
  el.innerHTML = `<div class="import-result ${isError ? 'error' : ''}">${msg}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 4000);
}
