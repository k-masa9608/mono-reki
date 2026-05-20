const KEY = 'mono_onboarded';

const STEPS = [
  {
    emoji: '📦',
    title: 'モノ歴へようこそ',
    body: '所有物の使用年数・コスパを記録して、モノとの歴史を振り返るアプリです。',
  },
  {
    emoji: '＋',
    title: 'アイテムを追加する',
    body: '右上の「＋」ボタンから使い始めた日を登録するだけ。金額を入れると1日コストが自動計算されます。',
  },
  {
    emoji: '📊',
    title: 'グラフで可視化',
    body: '使用年数のタイムラインや日割りコストを一覧で確認。長く使うほどランクが上がります。',
  },
];

export function shouldShow() {
  return !localStorage.getItem(KEY);
}

export function show(onDone) {
  let step = 0;

  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';
  overlay.className = 'ob-overlay';

  function render() {
    const s = STEPS[step];
    const dots = STEPS.map((_, i) =>
      `<span class="ob-dot${i === step ? ' active' : ''}"></span>`
    ).join('');
    overlay.innerHTML = `
      <div class="ob-sheet">
        <div class="ob-emoji">${s.emoji}</div>
        <div class="ob-title">${s.title}</div>
        <div class="ob-body">${s.body}</div>
        <div class="ob-dots">${dots}</div>
        <button class="ob-btn" id="ob-next">
          ${step < STEPS.length - 1 ? '次へ' : 'はじめる'}
        </button>
        ${step === 0 ? `<button class="ob-skip" id="ob-skip">スキップ</button>` : ''}
      </div>`;
    // overlay.querySelector を使う（DOM追加前でも動作する）
    overlay.querySelector('#ob-next')?.addEventListener('click', () => {
      if (step < STEPS.length - 1) { step++; render(); }
      else { close(); }
    });
    overlay.querySelector('#ob-skip')?.addEventListener('click', close);
  }

  function close() {
    localStorage.setItem(KEY, '1');
    overlay.classList.add('ob-hide');
    setTimeout(() => { overlay.remove(); onDone?.(); }, 350);
  }

  document.body.appendChild(overlay);
  render();
  requestAnimationFrame(() => overlay.classList.add('ob-show'));
}
