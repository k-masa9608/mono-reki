import { DB } from './db.js';
import { DEMO_ITEMS, today } from './utils.js';
import * as ListView      from './views/list.js';
import * as DetailView    from './views/detail.js';
import * as FormView      from './views/form.js';
import * as SimulatorView from './views/simulator.js';
import * as SettingsView  from './views/settings.js';
import * as GraphView     from './views/graph.js';
import * as RankingView    from './views/ranking.js';
import * as Onboarding    from './views/onboarding.js';
import * as WishlistView  from './views/wishlist.js';

const appHeader    = document.getElementById('app-header');
const main         = document.getElementById('main-content');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle   = document.getElementById('modal-title');
const modalBody    = document.getElementById('modal-body');
const modalEditBtn = document.getElementById('modal-edit-btn');

let currentView   = 'list';
let currentItemId = null;

// ── Modal ──
async function openModal(id) {
  const [item, allItems] = await Promise.all([DB.get(id), DB.getAll()]);
  if (!item) return;
  currentItemId = id;
  modalTitle.textContent = item.name;
  modalBody.innerHTML = DetailView.renderModal(item, allItems);
  modalEditBtn.onclick = () => { closeModal(); navigate('edit', { id }); };
  DetailView.initModal(item, navigate, closeModal, async delId => {
    await DB.delete(delId);
    closeModal();
    navigate('list');
  }, openModal);
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

modalOverlay?.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);

// スワイプ下方向でモーダルを閉じる
const modalSheet = document.getElementById('modal-sheet');
let _swipeY0 = 0;
let _swiping = false;
modalSheet?.addEventListener('touchstart', e => {
  _swipeY0 = e.touches[0].clientY;
  _swiping = false;
}, { passive: true });
modalSheet?.addEventListener('touchmove', e => {
  const dy = e.touches[0].clientY - _swipeY0;
  if (dy > 0 && modalSheet.scrollTop === 0) {
    _swiping = true;
    modalSheet.style.transition = 'none';
    modalSheet.style.transform  = `translateX(-50%) translateY(${Math.min(dy, 220)}px)`;
  }
}, { passive: true });
modalSheet?.addEventListener('touchend', e => {
  const dy = e.changedTouches[0].clientY - _swipeY0;
  modalSheet.style.transition = '';
  modalSheet.style.transform  = '';
  if (_swiping && dy > 80) closeModal();
  _swiping = false;
}, { passive: true });

// ── Bottom nav helper ──
const bottomNav = document.getElementById('bottom-nav');
const MAIN_VIEWS = new Set(['list', 'simulator', 'graph', 'wishlist', 'settings']);

function updateBottomNav(view) {
  if (!bottomNav) return;
  bottomNav.style.display = MAIN_VIEWS.has(view) ? '' : 'none';
  bottomNav.querySelectorAll('.bnav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

function showToast(msg, type = 'success') {
  const prev = document.getElementById('app-toast');
  if (prev) prev.remove();
  const el = document.createElement('div');
  el.id = 'app-toast';
  el.className = `app-toast app-toast-${type}`;
  el.textContent = msg;
  document.getElementById('app').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2500);
}

// ── Header templates ──
function headerMain(searchVal = '') {
  return `
    <div class="header-top">
      <span class="brand-main">モノ<span class="brand-accent">歴</span></span>
      <div class="header-search-box${searchVal ? ' has-val' : ''}" id="header-search-box">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input class="header-search-input" id="search-input" type="text" placeholder="検索…" value="${searchVal}" autocomplete="off">
        ${searchVal ? `<button class="header-search-clear" id="search-clear">✕</button>` : ''}
      </div>
      <button class="btn-add" id="btn-add">＋</button>
    </div>`;
}

function headerBack(title, showAdd = false) {
  return `
    <div class="header-top">
      <button class="btn-back" id="btn-back" aria-label="戻る">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path d="M19 12H5M5 12l7 7M5 12l7-7"/>
        </svg>
      </button>
      <span class="brand-main" style="font-size:16px;flex:1;padding:0 8px">${title}</span>
      ${showAdd
        ? `<button class="btn-add" id="btn-add">＋</button>`
        : `<span style="width:52px"></span>`}
    </div>`;
}

// ── Navigate ──
function navigate(view, params = {}) {
  currentView   = view;
  currentItemId = params.id || null;
  history.pushState({ view, ...params }, '', `#${view}${params.id ? `?id=${params.id}` : ''}`);
  renderView(view, params);
}

async function renderView(view, params = {}) {
  const _all  = await DB.getAll();
  const items = view === 'wishlist' || view === 'wishlist-add'
    ? _all
    : _all.filter(i => !i.wishlist);

  switch (view) {
    case 'list': {
      appHeader.innerHTML = headerMain(ListView.getSearch());
      main.innerHTML = ListView.render(items);
      ListView.init(navigate, openModal, {
        duplicate: id => navigate('add', { fromId: id }),
        endUse: async id => {
          const item = await DB.get(id);
          if (!item) return;
          await DB.put({ ...item, endDate: today(), updatedAt: new Date().toISOString() });
          showToast('使用終了しました ✓');
          navigate('list');
        },
        deleteItem: async id => {
          if (!confirm('削除しますか？')) return;
          await DB.delete(id);
          showToast('削除しました', 'error');
          navigate('list');
        },
      });
      document.getElementById('btn-try-demo')?.addEventListener('click', async () => {
        const now = new Date().toISOString();
        for (const demo of DEMO_ITEMS) await DB.put({ ...demo, createdAt: now, updatedAt: now });
        showToast('デモデータを追加しました ✓');
        navigate('list');
      });
      document.getElementById('btn-reset-demo')?.addEventListener('click', async () => {
        const DEMO_IDS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19'];
        for (const id of DEMO_IDS) await DB.delete(id);
        showToast('デモデータを削除しました', 'error');
        navigate('list');
      });
      bindHeaderMain();
      break;
    }
    case 'simulator': {
      appHeader.innerHTML = headerMain();
      main.innerHTML = SimulatorView.render(items);
      SimulatorView.init(items, navigate);
      bindHeaderMain();
      break;
    }
    case 'graph': {
      const { headerExtra, body } = GraphView.render(items);
      appHeader.innerHTML = headerMain() + headerExtra;
      main.innerHTML = body;
      GraphView.init(items, navigate, openModal);
      bindHeaderMain();
      break;
    }
    case 'settings': {
      appHeader.innerHTML = headerMain();
      main.innerHTML = SettingsView.render(items);
      SettingsView.init(navigate);
      bindHeaderMain();
      break;
    }
    case 'wishlist': {
      appHeader.innerHTML = headerBack('欲しいものリスト', true);
      main.innerHTML = WishlistView.render(items);
      WishlistView.init(items, navigate,
        async id => {
          if (!confirm('リストから削除しますか？')) return;
          await DB.delete(id);
          showToast('削除しました', 'error');
          navigate('wishlist');
        },
        async id => {
          const wish = await DB.get(id);
          if (!wish) return;
          // 購入した → 通常アイテム追加フォームへ引き継ぎ
          navigate('add', { fromWishId: id });
        }
      );
      document.getElementById('btn-back')?.addEventListener('click', () => navigate('list'));
      document.getElementById('btn-add')?.addEventListener('click', () => navigate('wishlist-add'));
      break;
    }
    case 'wishlist-add': {
      appHeader.innerHTML = headerBack('欲しいものを追加');
      main.innerHTML = `<div class="section" style="margin-top:10px">${WishlistView.renderAddForm()}</div>`;
      WishlistView.initAddForm(
        async item => {
          await DB.put(item);
          showToast('リストに追加しました ✓');
          navigate('wishlist');
        },
        () => navigate('wishlist')
      );
      document.getElementById('btn-back')?.addEventListener('click', () => navigate('wishlist'));
      break;
    }
    case 'ranking': {
      appHeader.innerHTML = headerMain();
      main.innerHTML = RankingView.render(items);
      RankingView.init(navigate);
      bindHeaderMain();
      break;
    }
    case 'add': {
      const endedItems = items.filter(i => i.endDate);
      let prefill = null;
      if (params.fromId) {
        const src = await DB.get(params.fromId);
        if (src) prefill = { ...src, startDate: today(), purchaseDate: null, endDate: null, disposalReason: null };
      }
      if (params.fromWishId) {
        const wish = await DB.get(params.fromWishId);
        if (wish) prefill = {
          name: wish.name, category: wish.category, icon: wish.icon || null,
          actualPrice: wish.targetPrice || null, listPrice: null,
          startDate: today(), purchaseDate: null, endDate: null,
          memo: wish.memo || '', usageFreq: null, purchasePlace: null,
          prevItemId: null, photo: null, disposalReason: null,
        };
      }
      const addTitle = params.fromWishId ? '購入アイテムを登録' : prefill ? '複製して追加' : 'アイテムを追加';
      appHeader.innerHTML = headerBack(addTitle);
      main.innerHTML = FormView.render(prefill, endedItems);
      FormView.init(null, navigate, async item => {
        await DB.put(item);
        if (params.fromWishId) await DB.delete(params.fromWishId);
        showToast('追加しました ✓');
      }, endedItems);
      bindHeaderBack('add', params);
      break;
    }
    case 'edit': {
      const item = await DB.get(params.id);
      const endedItems = items.filter(i => i.endDate && i.id !== item.id);
      appHeader.innerHTML = headerBack('編集');
      main.innerHTML = FormView.render(item, endedItems);
      FormView.init(item, navigate, async updated => { await DB.put(updated); showToast('更新しました ✓'); }, endedItems);
      bindHeaderBack('edit', params);
      break;
    }
    // detail kept for hash-routing fallback
    case 'detail': {
      await openModal(params.id);
      navigate('list');
      break;
    }
    default:
      navigate('list');
  }

  updateBottomNav(view);
  main.scrollTop = 0;
}

function bindHeaderMain() {
  document.getElementById('btn-add')?.addEventListener('click', () => navigate('add'));
}

function bindHeaderBack(view, params) {
  document.getElementById('btn-back')?.addEventListener('click', () => {
    navigate('list');
  });
}

// ── Hash routing ──
window.addEventListener('popstate', e => {
  if (e.state?.view) renderView(e.state.view, e.state);
  else renderView('list');
});

// ── Boot ──
const SEED_VERSION = '3';

async function boot() {
  // テーマ復元
  const savedTheme = localStorage.getItem('mono_theme');
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;

  // wire up bottom nav once
  bottomNav?.querySelectorAll('.bnav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });

  // 常に一覧から開始（hash は無視）
  renderView('list');

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);

  // オンボーディング（初回のみ）
  if (Onboarding.shouldShow()) Onboarding.show();
}

boot();
