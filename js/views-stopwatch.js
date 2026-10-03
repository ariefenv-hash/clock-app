'use strict';
/* 秒表视图：待机(计次禁用/启动) → 运行(计次/停止红) → 暂停(复位/继续) */

const StopwatchView = {
  key: 'stopwatch',
  root: null,
  refs: {},
  active: false,
  running: false,
  elapsed: 0,
  laps: [],
  _acc: 0,
  _startT: 0,
  _raf: 0,

  build() {
    const root = U.el(`
      <div class="view-root sw-wrap">
        <div class="sw-main">
          <div style="display:flex;flex-direction:column;align-items:center">
            <div class="dial-host"></div>
            <p class="sw-time neo-emboss">00:00:00</p>
          </div>
          <div class="lap-panel">
            <div class="lap-head"><span>计次</span><span>分段</span><span>累计</span></div>
            <div class="lap-scroll neo-scrollbar"><div class="lap-rows js-laps"></div></div>
          </div>
        </div>
        <div class="lap-panel mobile">
          <div class="lap-head"><span>计次</span><span>分段</span><span>累计</span></div>
          <div class="lap-scroll neo-scrollbar"><div class="lap-rows js-laps-m"></div></div>
        </div>
        <div class="sw-btns">
          <button class="sw-btn js-left" type="button">计次</button>
          <button class="sw-btn js-right" type="button">启动</button>
        </div>
      </div>
    `);
    this.root = root;
    this.refs = {
      dialHost: root.querySelector('.dial-host'),
      time: root.querySelector('.sw-time'),
      laps: root.querySelector('.js-laps'),
      lapsM: root.querySelector('.js-laps-m'),
      lapPanels: Array.from(root.querySelectorAll('.lap-panel')),
      left: root.querySelector('.js-left'),
      right: root.querySelector('.js-right'),
    };
    this.dial = createStopwatchDial(this.refs.dialHost, 300);
    this.refs.left.addEventListener('click', () => {
      if (this.running) this.lap();
      else if (this.laps.length > 0) this.reset();
    });
    this.refs.right.addEventListener('click', () => {
      if (this.running) this.stop();
      else this.start();
    });
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

  _loop() {
    if (!this.running) return;
    this.elapsed = this._acc + (performance.now() - this._startT);
    if (this.active) {
      this.refs.time.textContent = U.formatStopwatch(this.elapsed);
      this.dial.update((this.elapsed % 60000) / 60000);
    }
    this._raf = requestAnimationFrame(() => this._loop());
  },

  start() {
    this.running = true;
    this._startT = performance.now();
    cancelAnimationFrame(this._raf);
    this._loop();
    this.paint();
  },

  stop() {
    this.running = false;
    this._acc += performance.now() - this._startT;
    this.elapsed = this._acc;
    cancelAnimationFrame(this._raf);
    this.paint();
  },

  reset() {
    this.running = false;
    this._acc = 0;
    this._startT = 0;
    this.elapsed = 0;
    this.laps = [];
    cancelAnimationFrame(this._raf);
    if (this.active) {
      this.refs.time.textContent = U.formatStopwatch(0);
      this.dial.update(0);
    }
    this.paint();
  },

  lap() {
    const prevTotal = this.laps.length > 0 ? this.laps[this.laps.length - 1].total : 0;
    this.laps.push({ index: this.laps.length + 1, split: this.elapsed - prevTotal, total: this.elapsed });
    this.paintLaps();
  },

  paint() {
    if (!this.root) return;
    const hasLaps = this.laps.length > 0;
    const leftLabel = this.running ? '计次' : hasLaps ? '复位' : '计次';
    const leftEnabled = this.running || hasLaps;
    const rightLabel = this.running ? '停止' : this.elapsed > 0 ? '继续' : '启动';
    this.refs.left.textContent = leftLabel;
    this.refs.left.disabled = !leftEnabled;
    this.refs.left.className = `sw-btn js-left ${leftEnabled ? (this.running ? 'neo-cta' : 'neo-ghost') : 'neo-ghost'}`;
    this.refs.right.textContent = rightLabel;
    this.refs.right.className = `sw-btn js-right ${this.running ? 'neo-cta-danger' : 'neo-cta'}`;
    if (this.active) {
      this.refs.time.textContent = U.formatStopwatch(this.elapsed);
      this.dial.update((this.elapsed % 60000) / 60000);
    }
    this.paintLaps();
  },

  paintLaps() {
    const hasLaps = this.laps.length > 0;
    this.refs.lapPanels.forEach((p) => { p.style.display = hasLaps ? '' : 'none'; });
    if (!hasLaps) {
      this.refs.laps.innerHTML = '';
      this.refs.lapsM.innerHTML = '';
      return;
    }
    const rows = [...this.laps].reverse().map((l) =>
      `<div class="lap-row neo-raised-sm"><span>计次${l.index}</span><span>${U.formatStopwatch(l.split)}</span><span>${U.formatStopwatch(l.total)}</span></div>`
    ).join('');
    this.refs.laps.innerHTML = rows;
    this.refs.lapsM.innerHTML = rows;
  },
};
