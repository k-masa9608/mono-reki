import { calcDays, getRank, RANK_META, getCatAvg } from './utils.js';

const W = 600, H = 600, PAD = 44;

const CAT_ICONS = {
  'スマホ':'📱','PC':'💻','タブレット':'📟','イヤホン':'🎧',
  'カメラ':'📷','ゲーム機':'🎮','時計':'⌚','バッグ':'🎒',
  '洋服':'👔','家電':'📺','家具':'🪑','自転車':'🚲','楽器':'🎸','車・バイク':'🚗',
};

export async function generateShareCard(item) {
  const days    = calcDays(item.startDate, item.endDate);
  const avg     = getCatAvg(item.category);
  const ratio   = days / (avg * 365);
  const rank    = getRank(ratio);
  const meta    = rank ? RANK_META[rank] : null;
  const yrs     = (days / 365).toFixed(1);
  const cost    = item.actualPrice ? Math.round(item.actualPrice / days) : null;
  const over    = days >= avg * 365;
  const reps    = (item.actualPrice && over) ? Math.floor(days / (avg * 365)) : 0;
  const savings = reps >= 1 ? reps * item.actualPrice : 0;

  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── 背景 ──────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d1117');
  bg.addColorStop(1, '#1a2436');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // アクセントサークル（装飾）
  const accentColor = item.endDate ? '#94a3b8' : over ? '#4ade80' : '#3b82f6';
  ctx.beginPath();
  ctx.arc(W - 60, 80, 220, 0, Math.PI * 2);
  ctx.fillStyle = `${accentColor}12`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(W - 60, 80, 140, 0, Math.PI * 2);
  ctx.fillStyle = `${accentColor}0a`;
  ctx.fill();

  // ── アプリ名 ──────────────────────────────────
  ctx.font = `600 20px "DM Sans", -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.textAlign = 'left';
  ctx.fillText('モノ歴', PAD, 52);

  // ── ランクバッジ ──────────────────────────────
  if (meta) {
    _drawRankBadge(ctx, rank, meta, W - PAD, 34);
  }

  // セパレーター
  ctx.beginPath();
  ctx.moveTo(PAD, 70); ctx.lineTo(W - PAD, 70);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1; ctx.stroke();

  // ── アイコン + アイテム名 ─────────────────────
  const icon = item.icon || CAT_ICONS[item.category] || '📦';
  ctx.font = '36px sans-serif';
  ctx.fillText(icon, PAD, 136);

  ctx.font = `700 28px "DM Sans", -apple-system, sans-serif`;
  ctx.fillStyle = '#ffffff';
  const nameStr = item.name.length > 22 ? item.name.slice(0, 21) + '…' : item.name;
  ctx.fillText(nameStr, PAD, 184);

  ctx.font = `400 15px "DM Sans", -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillText(item.category, PAD, 206);

  // ── 大きな年数 ────────────────────────────────
  ctx.font = `800 148px "Bebas Neue", "DM Sans", sans-serif`;
  ctx.fillStyle = accentColor;
  ctx.fillText(yrs, PAD, 396);

  const numW = ctx.measureText(yrs).width;

  // "年" ラベル（右下に小さく）
  ctx.font = `700 32px "DM Sans", -apple-system, sans-serif`;
  ctx.fillStyle = accentColor;
  ctx.fillText('年', PAD + numW + 8, 396);

  // サブラベル
  ctx.font = `400 18px "DM Sans", -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(item.endDate ? '間使用しました' : '使い続けています', PAD, 428);

  // ── 節約額 ────────────────────────────────────
  let infoY = 472;
  if (savings > 0) {
    ctx.font = `700 26px "DM Sans", -apple-system, sans-serif`;
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`🎉 ¥${savings.toLocaleString('ja-JP')} 節約中！`, PAD, infoY);
    infoY += 38;
  }

  // 1日コスト
  if (cost) {
    ctx.font = `500 18px "DM Sans", -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(`¥${cost.toLocaleString('ja-JP')}/日`, PAD, infoY);
  }

  // ── フッター ──────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(PAD, H - 54); ctx.lineTo(W - PAD, H - 54);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1; ctx.stroke();

  ctx.font = `500 15px "DM Sans", -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.textAlign = 'left';
  ctx.fillText('#モノ歴', PAD, H - 22);
  ctx.textAlign = 'right';
  ctx.fillText('何年使った？を記録するアプリ', W - PAD, H - 22);
  ctx.textAlign = 'left';

  return canvas;
}

function _drawRankBadge(ctx, rank, meta, rightX, topY) {
  ctx.font = `800 13px "DM Sans", -apple-system, sans-serif`;
  const text = `${rank}  ${meta.label}`;
  const tw   = ctx.measureText(text).width;
  const pw = 12, bh = 26;
  const bw = tw + pw * 2;
  const bx = rightX - bw;

  if (rank === 'SS') {
    const g = ctx.createLinearGradient(bx, topY, bx + bw, topY + bh);
    g.addColorStop(0, '#ff6fd8'); g.addColorStop(1, '#3813c2');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = meta.bg;
  }

  ctx.beginPath();
  ctx.roundRect(bx, topY, bw, bh, 6);
  ctx.fill();

  ctx.fillStyle = meta.text;
  ctx.textAlign = 'center';
  ctx.fillText(text, bx + bw / 2, topY + 18);
  ctx.textAlign = 'left';
}

export function canvasToBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

// シェアプレビューオーバーレイを表示
export async function showSharePreview(item) {
  // 既存があれば除去
  document.getElementById('share-prev-ov')?.remove();

  const canvas  = await generateShareCard(item);
  const blob    = await canvasToBlob(canvas);
  const dataUrl = canvas.toDataURL('image/png');

  const ov = document.createElement('div');
  ov.id = 'share-prev-ov';
  ov.className = 'spr-overlay';
  ov.innerHTML = `
    <div class="spr-sheet">
      <div class="spr-img-wrap">
        <img src="${dataUrl}" class="spr-img" alt="シェアカード">
      </div>
      <div class="spr-btns">
        <button class="spr-btn spr-btn-share" id="spr-native">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
          </svg>
          シェア
        </button>
        <button class="spr-btn spr-btn-save" id="spr-save">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          保存
        </button>
      </div>
      <button class="spr-close" id="spr-close">閉じる</button>
    </div>`;

  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('open'));

  const close = () => {
    ov.classList.remove('open');
    setTimeout(() => ov.remove(), 280);
  };

  ov.querySelector('#spr-close').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });

  ov.querySelector('#spr-save').addEventListener('click', () => {
    const a = Object.assign(document.createElement('a'), {
      href: dataUrl,
      download: `monoreki_${item.name.replace(/\s+/g, '_')}.png`,
    });
    a.click();
  });

  ov.querySelector('#spr-native').addEventListener('click', async () => {
    const file = new File([blob], 'monoreki_share.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'モノ歴' }); } catch {}
    } else if (navigator.share) {
      const days = calcDays(item.startDate, item.endDate);
      const yrs  = (days / 365).toFixed(1);
      try { await navigator.share({ title: 'モノ歴', text: `「${item.name}」を${yrs}年使っています！ #モノ歴` }); } catch {}
    } else {
      // clipboard fallback
      try {
        await navigator.clipboard.writeText(`「${item.name}」を${(calcDays(item.startDate,item.endDate)/365).toFixed(1)}年使っています！ #モノ歴`);
        const btn = ov.querySelector('#spr-native');
        if (btn) { btn.textContent = '✓ コピーしました'; }
      } catch {}
    }
  });
}
