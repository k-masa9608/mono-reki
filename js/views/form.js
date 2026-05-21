import { CATEGORIES, CATEGORY_GROUPS, USAGE_FREQ_OPTIONS, DISPOSAL_REASONS, genId, today,
         calcDays, fmtYearsDecimal } from '../utils.js';

let _photoData = null;

const CAT_ICONS = {
  'スマホ':'📱','PC':'💻','タブレット':'📟','イヤホン':'🎧',
  'カメラ':'📷','ゲーム機':'🎮','時計':'⌚','バッグ':'🎒',
  '洋服':'👔','家電':'📺','家具':'🪑','自転車':'🚲','楽器':'🎸','車・バイク':'🚗',
};

function buildCatGrid(selectedCat) {
  return CATEGORY_GROUPS.map(g => `
    <div class="cat-group-row">
      <span class="cat-group-lbl">${g.label}</span>
      <div class="cat-chip-row">
        ${g.cats.map(cat => `
          <button type="button" class="cat-chip${selectedCat===cat?' active':''}" data-cat="${cat}">
            <span class="cat-chip-icon">${CAT_ICONS[cat]||'📦'}</span>
            <span class="cat-chip-name">${cat}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function buildPrevOpts(endedItems, category, selectedId) {
  const opts = endedItems.filter(i => i.category === category);
  if (!opts.length) return '';
  const rows = opts.map(i => {
    const yrs = fmtYearsDecimal(calcDays(i.startDate, i.endDate));
    return `<option value="${i.id}" ${selectedId===i.id?'selected':''}>${i.name}（${yrs}年使用）</option>`;
  }).join('');
  return `
  <div class="form-group" id="prev-item-group" style="margin-top:10px">
    <label class="form-label form-label-row">
      <span>前の機種</span><span class="form-hint">世代チェーンを繋げる</span>
    </label>
    <select class="form-input" id="f-prev">
      <option value="">なし</option>${rows}
    </select>
  </div>`;
}

const DEFAULT_PLACES = ['Apple Store', 'Amazon', 'メルカリ', 'Yahoo!ショッピング', '楽天市場', 'ビックカメラ', 'ヨドバシカメラ', 'PayPayフリマ'];

function buildPlaceDatalist(allItems) {
  const places = new Set(DEFAULT_PLACES);
  for (const i of allItems) {
    if (i.purchasePlace) places.add(i.purchasePlace);
  }
  return `<datalist id="place-list">${[...places].map(p => `<option value="${p}">`).join('')}</datalist>`;
}

export function render(item = null, endedItems = [], allItems = []) {
  _photoData = item?.photo || null;

  const d = item || {
    name: '', category: Object.keys(CATEGORIES)[0],
    purchaseDate: '', startDate: today(),
    listPrice: '', actualPrice: '', purchasePlace: '',
    endDate: '', memo: '', photo: null,
    usageFreq: '', disposalReason: '', prevItemId: null,
  };

  const thumbHtml = d.photo
    ? `<img src="${d.photo}" alt="">`
    : `<div class="photo-hint"><span>📷</span><span>タップして写真を追加</span></div>`;

  const freqBtns = USAGE_FREQ_OPTIONS.map(f =>
    `<button type="button" class="freq-btn${d.usageFreq===f?' active':''}" data-freq="${f}">${f}</button>`
  ).join('');

  const disposalOpts = DISPOSAL_REASONS.map(r =>
    `<option value="${r}"${d.disposalReason===r?' selected':''}>${r}</option>`
  ).join('');

  return `
  <form id="item-form" class="form">

    <!-- ① 基本情報 -->
    <div class="section form-section">
      <div class="form-section-hd">
        <span class="form-step-badge">1</span>
        <span class="form-step-title">基本情報</span>
        <span class="form-step-req">必須</span>
      </div>

      <div class="form-group">
        <label class="form-label" for="f-name">商品名</label>
        <div class="name-icon-row">
          <button type="button" class="icon-pick-btn" id="icon-pick-btn" title="アイコンを変更">${d.icon || CAT_ICONS[d.category] || '📦'}</button>
          <input class="form-input form-input-lg" id="f-name" type="text"
                 value="${d.name}" placeholder="例：iPhone 15 Pro" autocomplete="off" required>
        </div>
        <input type="hidden" id="f-icon" value="${d.icon || ''}">
      </div>

      <div class="form-group" style="margin-top:14px">
        <label class="form-label">カテゴリ</label>
        <input type="hidden" id="f-cat" value="${d.category}">
        <div class="cat-grid" id="cat-grid">${buildCatGrid(d.category)}</div>
      </div>
    </div>

    <!-- ② 使用期間 -->
    <div class="section form-section">
      <div class="form-section-hd">
        <span class="form-step-badge">2</span>
        <span class="form-step-title">使用期間</span>
        <span class="form-step-req">必須</span>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="f-start">使い始めた日</label>
          <div class="date-input-wrap">
            <input class="form-input" id="f-start" type="date" value="${d.startDate}" required>
            <button type="button" class="date-today-btn" data-target="f-start">今日</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label form-label-row">
            <span>購入日</span><span class="form-hint">任意</span>
          </label>
          <div class="date-input-wrap">
            <input class="form-input" id="f-purchase" type="date" value="${d.purchaseDate||''}">
            <button type="button" class="date-today-btn" data-target="f-purchase">今日</button>
          </div>
        </div>
      </div>

      <div class="form-row" style="margin-top:8px">
        <div class="form-group">
          <label class="form-label form-label-row">
            <span>使用終了日</span><span class="form-hint">未入力=使用中</span>
          </label>
          <input class="form-input" id="f-end" type="date" value="${d.endDate||''}">
          <span class="field-error" id="f-end-error" style="display:none">終了日は開始日より後の日付を入力してください</span>
        </div>
        <div class="form-group" id="disposal-group" style="${d.endDate?'':'visibility:hidden'}">
          <label class="form-label" for="f-disposal">手放した理由</label>
          <select class="form-input" id="f-disposal">
            <option value="">選択</option>${disposalOpts}
          </select>
        </div>
      </div>

      <div id="prev-item-wrap">${buildPrevOpts(endedItems, d.category, d.prevItemId)}</div>
    </div>

    <!-- ③ コスト（任意） -->
    <div class="section form-section form-section-opt">
      <div class="form-section-hd form-section-toggle${d.actualPrice||d.listPrice||d.purchasePlace?' open':''}" id="toggle-cost">
        <span class="form-step-badge form-step-badge-opt">任</span>
        <span class="form-step-title">コスト</span>
        <span class="form-step-hint">入力するとコスパスコアが出ます</span>
        <svg class="form-toggle-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <div class="form-section-body${d.actualPrice||d.listPrice||d.purchasePlace?' open':''}" id="body-cost">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="f-actual">実質購入額</label>
            <div class="input-prefix">
              <span class="prefix">¥</span>
              <input class="form-input with-prefix" id="f-actual" type="number" inputmode="numeric"
                     min="0" step="1" value="${d.actualPrice||''}" placeholder="160,000">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="f-list">参考価格</label>
            <div class="input-prefix">
              <span class="prefix">¥</span>
              <input class="form-input with-prefix" id="f-list" type="number" inputmode="numeric"
                     min="0" step="1" value="${d.listPrice||''}" placeholder="180,000">
            </div>
          </div>
        </div>
        <div class="form-group" style="margin-top:8px">
          <label class="form-label" for="f-place">購入場所</label>
          ${buildPlaceDatalist(allItems)}
          <input class="form-input" id="f-place" type="text"
                 value="${d.purchasePlace||''}" placeholder="例：Apple Store、メルカリ"
                 list="place-list" autocomplete="off">
        </div>
      </div>
    </div>

    <!-- ④ 詳細（任意） -->
    <div class="section form-section form-section-opt">
      <div class="form-section-hd form-section-toggle${d.usageFreq||d.memo||d.photo?' open':''}" id="toggle-detail">
        <span class="form-step-badge form-step-badge-opt">任</span>
        <span class="form-step-title">詳細</span>
        <span class="form-step-hint">頻度・メモ・写真</span>
        <svg class="form-toggle-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <div class="form-section-body${d.usageFreq||d.memo||d.photo?' open':''}" id="body-detail">
        <div class="form-group">
          <label class="form-label">使用頻度</label>
          <div class="freq-btn-row" id="freq-btn-row">${freqBtns}</div>
          <input type="hidden" id="f-freq" value="${d.usageFreq||''}">
        </div>

        <div class="form-group" style="margin-top:10px">
          <label class="form-label" for="f-memo">メモ</label>
          <textarea class="form-input form-textarea" id="f-memo" rows="2"
                    placeholder="モデル名・色・感想など">${d.memo||''}</textarea>
        </div>

        <div class="form-group" style="margin-top:10px">
          <label class="form-label">写真</label>
          <div class="photo-upload-area" id="photo-upload-area">${thumbHtml}</div>
          <input type="file" id="f-photo" accept="image/*" style="display:none">
          ${d.photo ? `<button type="button" class="photo-remove" id="btn-remove-photo">× 写真を削除</button>` : ''}
        </div>
      </div>
    </div>

    <div class="form-actions${item ? ' form-actions-3' : ''}" style="padding:0 8px 8px">
      <button type="button" class="btn-secondary" id="btn-cancel">キャンセル</button>
      ${item ? `<button type="button" class="btn-duplicate" id="btn-duplicate">複製</button>` : ''}
      <button type="submit" class="btn-primary">${item ? '更新する' : '追加する'}</button>
    </div>

  </form>`;
}

export function init(existingItem, navigate, saveItem, endedItems = []) {
  // accordion toggles for optional sections
  ['cost', 'detail'].forEach(id => {
    document.getElementById(`toggle-${id}`)?.addEventListener('click', () => {
      document.getElementById(`toggle-${id}`).classList.toggle('open');
      document.getElementById(`body-${id}`).classList.toggle('open');
    });
  });

  // icon picker (inline popover with common emojis)
  const ICON_EMOJIS = ['📱','💻','📟','🎧','📷','🎮','⌚','🎒','👔','📺','🪑','🚲','🎸','🚗',
                        '🏋️','🍳','📚','🧴','💊','🛋️','🖥️','🖨️','🎹','🎺','🎻','🏀','⚽','🎯'];
  document.getElementById('icon-pick-btn')?.addEventListener('click', () => {
    const existing = document.getElementById('icon-popover');
    if (existing) { existing.remove(); return; }
    const btn = document.getElementById('icon-pick-btn');
    const pop = document.createElement('div');
    pop.id = 'icon-popover';
    pop.className = 'icon-popover';
    pop.innerHTML = ICON_EMOJIS.map(e =>
      `<button type="button" class="icon-pop-item">${e}</button>`
    ).join('') + `<button type="button" class="icon-pop-reset">リセット</button>`;
    btn.insertAdjacentElement('afterend', pop);
    pop.querySelectorAll('.icon-pop-item').forEach(el => {
      el.addEventListener('click', () => {
        document.getElementById('f-icon').value = el.textContent;
        document.getElementById('icon-pick-btn').textContent = el.textContent;
        pop.remove();
      });
    });
    pop.querySelector('.icon-pop-reset')?.addEventListener('click', () => {
      document.getElementById('f-icon').value = '';
      const cat = document.getElementById('f-cat').value;
      document.getElementById('icon-pick-btn').textContent = CAT_ICONS[cat] || '📦';
      pop.remove();
    });
  });

  // photo
  document.getElementById('photo-upload-area')?.addEventListener('click', () =>
    document.getElementById('f-photo')?.click()
  );
  document.getElementById('f-photo')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file).then(data => {
      _photoData = data;
      const area = document.getElementById('photo-upload-area');
      if (area) area.innerHTML = `<img src="${_photoData}" alt="">`;
      if (!document.getElementById('btn-remove-photo')) {
        const btn = Object.assign(document.createElement('button'), {
          type: 'button', className: 'photo-remove', id: 'btn-remove-photo', textContent: '× 写真を削除',
        });
        area?.insertAdjacentElement('afterend', btn);
        btn.addEventListener('click', handleRemovePhoto);
      }
    }).catch(() => {
      alert('画像の読み込みに失敗しました。別の画像をお試しください。');
    });
  });
  document.getElementById('btn-remove-photo')?.addEventListener('click', handleRemovePhoto);

  // category chip grid
  document.querySelectorAll('.cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('f-cat').value = btn.dataset.cat;
      // アイコンにカスタム設定がなければカテゴリアイコンに追従
      if (!document.getElementById('f-icon').value) {
        const iconBtn = document.getElementById('icon-pick-btn');
        if (iconBtn) iconBtn.textContent = CAT_ICONS[btn.dataset.cat] || '📦';
      }
      const wrap = document.getElementById('prev-item-wrap');
      if (wrap) wrap.innerHTML = buildPrevOpts(endedItems, btn.dataset.cat, null);
    });
  });

  // today buttons
  document.querySelectorAll('.date-today-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (input) { input.value = today(); input.dispatchEvent(new Event('change')); }
    });
  });

  // freq buttons
  document.querySelectorAll('.freq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = document.getElementById('f-freq').value;
      const next = current === btn.dataset.freq ? '' : btn.dataset.freq;
      document.getElementById('f-freq').value = next;
      document.querySelectorAll('.freq-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.freq === next)
      );
    });
  });

  // show disposal reason when end date is filled
  const endInput = document.getElementById('f-end');
  const disposalGroup = document.getElementById('disposal-group');
  endInput?.addEventListener('change', () => {
    if (disposalGroup) disposalGroup.style.visibility = endInput.value ? 'visible' : 'hidden';
  });

  // duplicate
  document.getElementById('btn-duplicate')?.addEventListener('click', () => {
    if (existingItem) navigate('add', { fromId: existingItem.id });
  });

  // cancel
  document.getElementById('btn-cancel')?.addEventListener('click', () => {
    existingItem ? navigate('detail', { id: existingItem.id }) : navigate('list');
  });

  // submit
  document.getElementById('item-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('f-name').value.trim();
    if (!name) { alert('商品名を入力してください'); return; }
    const _startDate = document.getElementById('f-start').value;
    const _endDateVal = document.getElementById('f-end').value;
    const _endErrEl = document.getElementById('f-end-error');
    if (_endDateVal && _endDateVal < _startDate) {
      if (_endErrEl) _endErrEl.style.display = 'block';
      document.getElementById('f-end').focus();
      return;
    }
    if (_endErrEl) _endErrEl.style.display = 'none';
    const actualPrice = parseFloat(document.getElementById('f-actual').value) || null;
    const now = new Date().toISOString();
    const endDate = document.getElementById('f-end').value || null;
    const item = {
      id:            existingItem?.id || genId(),
      name,
      icon:          document.getElementById('f-icon').value.trim() || null,
      category:      document.getElementById('f-cat').value,
      startDate:     document.getElementById('f-start').value,
      purchaseDate:  document.getElementById('f-purchase').value || null,
      actualPrice:   actualPrice && actualPrice > 0 ? actualPrice : null,
      listPrice:     parseFloat(document.getElementById('f-list').value) || null,
      purchasePlace: document.getElementById('f-place').value.trim() || null,
      endDate,
      disposalReason: endDate ? (document.getElementById('f-disposal').value || null) : null,
      memo:           document.getElementById('f-memo').value.trim() || '',
      usageFreq:      document.getElementById('f-freq').value || null,
      prevItemId:     document.getElementById('f-prev')?.value || null,
      photo:          _photoData,
      createdAt:      existingItem?.createdAt || now,
      updatedAt:      now,
    };
    await saveItem(item);
    navigate('list');
  });
}

function compressImage(file, maxW = 1024, quality = 0.72) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const scale  = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function handleRemovePhoto() {
  _photoData = null;
  const area = document.getElementById('photo-upload-area');
  if (area) area.innerHTML = `<div class="photo-hint"><span>📷</span><span>タップして写真を追加</span></div>`;
  document.getElementById('btn-remove-photo')?.remove();
}
