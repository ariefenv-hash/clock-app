'use strict';
/* 全屏响铃遮罩 —— 瓷面满屏、凹陷信息井、陶土呼吸按钮与脉冲光环 */

const RingOverlay = {
  _el: null,
  _timer: null,

  /**
   * ring: { type:'alarm', alarm } 或 { type:'timer' }
   * handlers: { onClose, onSnooze }
   */
  show(ring, handlers) {
    this.hide();
    const isTimer = ring.type === 'timer';
    const elapsedEl = U.el('<span>00:00</span>');

    const el = U.el('<div class="ring-overlay" role="alertdialog" aria-modal="true"></div>');
    el.setAttribute('aria-label', isTimer ? '时间到' : '闹钟响铃');
    const grain = U.el('<div class="grain-overlay" aria-hidden="true"></div>');
    el.appendChild(grain);

    if (isTimer) {
      const well = U.el(`
        <div class="ring-well neo-inset">
          <h1 class="ring-title big" style="margin-top:0">时间到</h1>
          <p class="ring-elapsed big"></p>
        </div>
      `);
      well.querySelector('.ring-elapsed').appendChild(elapsedEl);
      el.appendChild(well);

      const wrap = U.el(`
        <div class="ring-close-wrap" style="margin-top:16px">
          <span class="pulse animate-pulse-ring" aria-hidden="true"></span>
          <span class="pulse soft animate-pulse-ring" aria-hidden="true" style="animation-delay:0.65s"></span>
          <button class="ring-close circle neo-cta animate-breathe" type="button">关闭</button>
        </div>
      `);
      wrap.querySelector('.ring-close').addEventListener('click', () => handlers.onClose());
      el.appendChild(wrap);
    } else {
      const a = ring.alarm;
      const well = U.el(`
        <div class="ring-well neo-inset">
          <p class="ring-hm">${U.formatHM(new Date(a.hour * 3600000 + a.minute * 60000))}</p>
          <h1 class="ring-title">${U.esc(a.label || '闹钟')}</h1>
          <p class="ring-elapsed"></p>
        </div>
      `);
      well.querySelector('.ring-elapsed').appendChild(elapsedEl);
      el.appendChild(well);

      const btns = U.el('<div class="ring-btns"></div>');
      if (a.snooze) {
        const snoozeBtn = U.el('<button class="ring-snooze neo-ghost" type="button">贪睡</button>');
        snoozeBtn.addEventListener('click', () => handlers.onSnooze());
        btns.appendChild(snoozeBtn);
      }
      const wrap = U.el(`
        <div class="ring-close-wrap">
          <span class="pulse animate-pulse-ring" aria-hidden="true"></span>
          <button class="ring-close neo-cta" type="button">关闭</button>
        </div>
      `);
      wrap.querySelector('.ring-close').addEventListener('click', () => handlers.onClose());
      btns.appendChild(wrap);
      el.appendChild(btns);
    }

    document.body.appendChild(el);
    this._el = el;

    // 响铃计时
    const start = Date.now();
    this._timer = setInterval(() => {
      const sec = Math.floor((Date.now() - start) / 1000);
      elapsedEl.textContent = `${U.pad2(Math.floor(sec / 60))}:${U.pad2(sec % 60)}`;
    }, 250);
  },

  hide() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._el) { this._el.remove(); this._el = null; }
  },
};
