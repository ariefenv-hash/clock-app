'use strict';
/* 铃声选择弹窗 —— 瓷面底部面板（自定义铃声存 IndexedDB） */

const RING_ORDER = ['custom', 'none', 'light', 'happyhour', 'amusement', 'flashing', 'signal'];

/**
 * openRingtoneModal({ value, customReady, onSelect })
 * 返回 { close }；选择时回调 onSelect(id)（选择即关闭）。
 */
function openRingtoneModal(opts) {
  const backdrop = U.el(`
    <div class="sheet-backdrop" role="dialog" aria-modal="true" aria-label="铃声选择">
      <input type="file" accept="audio/*" style="display:none">
      <div class="sheet-panel">
        <div class="grab neo-inset-sm"></div>
        <div class="sheet-head">
          <h2 class="sheet-title">铃声选择</h2>
          <button class="sheet-close" type="button">关闭</button>
        </div>
        <div class="sheet-body"></div>
      </div>
    </div>
  `);
  const fileInput = backdrop.querySelector('input[type=file]');
  const body = backdrop.querySelector('.sheet-body');
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    backdrop.remove();
  }

  function renderRows() {
    body.innerHTML = '';
    for (const id of RING_ORDER) {
      const selected = opts.value === id;
      const row = U.el(`
        <button class="ring-row ${selected ? 'neo-inset-sm' : 'hov'}" type="button"
                aria-pressed="${selected}">
          <span>
            ${Ringtones.RINGTONE_LABELS[id]}
            ${id === 'custom' && opts.customReady && selected ? '<span class="sub">已导入</span>' : ''}
          </span>
          ${id === 'custom'
            ? `<span class="row-chev">${Icons.chev}</span>`
            : `<span class="radio ${selected ? 'on' : ''}"><i></i></span>`}
        </button>
      `);
      row.addEventListener('click', () => {
        if (id === 'custom') {
          fileInput.click();
          return;
        }
        opts.value = id;
        if (opts.onSelect) opts.onSelect(id);
        Ringtones.preview(id);
        close();
      });
      body.appendChild(row);
    }
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      await Store.putBlob('custom-ringtone', file);
      window.dispatchEvent(new CustomEvent('clock:custom-ringtone'));
      if (opts.onSelect) opts.onSelect('custom');
      close();
    } catch (e) { /* 忽略存储失败 */ }
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector('.sheet-close').addEventListener('click', close);

  renderRows();
  document.body.appendChild(backdrop);
  return { close };
}
