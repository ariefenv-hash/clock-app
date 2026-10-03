'use strict';
/* 计时器视图：滚轮设置 → 运行（凹槽进度环） → 到点全屏提醒 */

const TimerView = {
  key: 'timer',
  root: null,
  refs: {},
  active: false,
  phase: 'idle', // idle | running | paused
  hIdx: 0, mIdx: 0, sIdx: 0,
  remaining: 0,
  total: 0,
  _endAt: 0,
  _int: null,
  _pickers: [],

  build() {
    const root = U.el(`
      <div class="view-root tm-wrap">
        <button class="bell-btn neo-raised-sm neo-press js-bell" type="button" aria-label="铃声选择">${Icons.bell}</button>

        <div class="js-idle" style="display:flex;flex-direction:column;align-items:center">
          <div class="tm-tray neo-inset" style="position:relative">
            <div class="wheel-band neo-raised-sm" aria-hidden="true"></div>
            <div class="js-wheels" style="position:relative;display:flex;align-items:flex-start;justify-content:center;gap:8px"></div>
          </div>
          <button class="tm-start neo-cta js-start" type="button">开始</button>
        </div>

        <div class="js-run" style="display:none;flex-direction:column;align-items:center">
          <div class="timer-disc neo-raised">
            <div style="position:relative">
              <svg width="330" height="330" viewBox="0 0 330 330" style="display:block;user-select:none">
                <circle class="js-g-dark" cx="165" cy="165" r="148" fill="none" stroke="rgba(146,159,186,0.55)" stroke-width="13" transform="translate(-2 -2.5)"/>
                <circle class="js-g-light" cx="165" cy="165" r="148" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="13" transform="translate(2 2.5)"/>
                <circle cx="165" cy="165" r="148" fill="none" stroke="#e0e5ef" stroke-width="8.5"/>
                <circle class="js-arc" cx="165" cy="165" r="148" fill="none" stroke="#e07a5f" stroke-width="9" stroke-linecap="round" transform="rotate(-90 165 165)" style="filter:drop-shadow(0 5px 10px rgba(224,122,95,0.4))"/>
              </svg>
              <div class="tm-center">
                <p class="tm-count neo-emboss">00:00:00</p>
                <p class="tm-cap">计时</p>
              </div>
            </div>
          </div>
          <div class="tm-btns">
            <button class="sw-btn neo-ghost js-finish" type="button">完成</button>
            <button class="sw-btn neo-cta js-toggle" type="button">暂停</button>
          </div>
        </div>
      </div>
    `);
    this.root = root;
    this.refs = {
      idle: root.querySelector('.js-idle'),
      run: root.querySelector('.js-run'),
      wheels: root.querySelector('.js-wheels'),
      start: root.querySelector('.js-start'),
      arc: root.querySelector('.js-arc'),
      count: root.querySelector('.tm-count'),
      finish: root.querySelector('.js-finish'),
      toggle: root.querySelector('.js-toggle'),
    };

    const wheelsHost = this.refs.wheels;
    // 小屏收窄滚轮，避免托盘横向溢出视口（3×宽 + 间距 + 托盘内边距 ≤ 可用宽度）
    const wheelW = Math.min(124, Math.floor((Math.min(window.innerWidth, 480) - 32 - 48 - 16) / 3));
    this._pickers = [
      new WheelPicker(wheelsHost, { values: U.numberRange(100), index: this.hIdx, unit: '时', width: wheelW, onChange: (i) => { this.hIdx = i; this._syncIdle(); } }),
      new WheelPicker(wheelsHost, { values: U.numberRange(60), index: this.mIdx, unit: '分', width: wheelW, onChange: (i) => { this.mIdx = i; this._syncIdle(); } }),
      new WheelPicker(wheelsHost, { values: U.numberRange(60), index: this.sIdx, unit: '秒', width: wheelW, onChange: (i) => { this.sIdx = i; this._syncIdle(); } }),
    ];

    root.querySelector('.js-bell').addEventListener('click', () => {
      openRingtoneModal({
        value: App.timerRingtone,
        customReady: App.customReady,
        onSelect: (id) => App.setTimerRingtone(id),
      });
    });
    this.refs.start.addEventListener('click', () => this.start());
    this.refs.toggle.addEventListener('click', () => {
      if (this.phase === 'running') this.pause();
      else if (this.phase === 'paused') this.resume();
    });
    this.refs.finish.addEventListener('click', () => this.finish());

    App.viewRoot.appendChild(root);
    this.paint();
  },

  show() {
    if (!this.root) this.build();
    this.active = true;
    this.root.classList.add('active');
    this.paint();
  },
  hide() { this.active = false; this.root.classList.remove('active'); },

  _totalMs() { return (this.hIdx * 3600 + this.mIdx * 60 + this.sIdx) * 1000; },

  start() {
    const totalMs = this._totalMs();
    if (totalMs <= 0) return;
    this.total = totalMs;
    this._endAt = Date.now() + totalMs;
    this.remaining = totalMs;
    this.phase = 'running';
    this._startInterval();
    this.paint();
  },

  pause() {
    this.remaining = Math.max(0, this._endAt - Date.now());
    this.phase = 'paused';
    this._stopInterval();
    this.paint();
  },

  resume() {
    this._endAt = Date.now() + this.remaining;
    this.phase = 'running';
    this._startInterval();
    this.paint();
  },

  finish() {
    this.phase = 'idle';
    this.remaining = 0;
    this._stopInterval();
    this.paint();
  },

  /** 同步开始按钮可用态（滚轮变更时调用） */
  _syncIdle() {
    if (this.phase === 'idle' && this.refs.start) {
      this.refs.start.disabled = this._totalMs() <= 0;
    }
  },

  _startInterval() {
    this._stopInterval();
    this._int = setInterval(() => {
      const rem = this._endAt - Date.now();
      if (rem <= 0) {
        const total = this.total;
        this.phase = 'idle';
        this.remaining = 0;
        this._stopInterval();
        this.paint();
        App.handleTimerDone(total);
      } else {
        this.remaining = rem;
        if (this.active) this._paintRun();
      }
    }, 200);
  },

  _stopInterval() {
    if (this._int) { clearInterval(this._int); this._int = null; }
  },

  paint() {
    if (!this.root) return;
    const idle = this.phase === 'idle';
    this.refs.idle.style.display = idle ? 'flex' : 'none';
    this.refs.run.style.display = idle ? 'none' : 'flex';
    if (idle) {
      this._pickers.forEach((p) => p.setIndex(p === this._pickers[0] ? this.hIdx : p === this._pickers[1] ? this.mIdx : this.sIdx));
      this._syncIdle();
    } else {
      this.refs.finish.disabled = this.phase !== 'paused';
      this.refs.finish.className = `sw-btn ${this.phase === 'paused' ? 'neo-ghost' : 'neo-ghost'}`;
      this.refs.toggle.textContent = this.phase === 'running' ? '暂停' : '继续';
      this._paintRun();
    }
  },

  _paintRun() {
    const frac = this.phase === 'idle' ? 0 : (this.total > 0 ? this.remaining / this.total : 0);
    const shown = this.phase === 'idle' ? this._totalMs() : this.remaining;
    const C = 2 * Math.PI * 148;
    this.refs.arc.setAttribute('stroke-dasharray', `${Math.max(0.001, frac * (C - 12))} ${C}`);
    this.refs.count.textContent = U.formatCountdown(shown);
  },
};
