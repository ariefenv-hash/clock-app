'use strict';
/* 应用外壳：状态/持久化/标签页/闹钟调度引擎/响铃/通知/PWA */

const TABS = [
  { key: 'alarm', label: '闹钟', icon: 'alarm' },
  { key: 'world', label: '世界时钟', icon: 'globe' },
  { key: 'stopwatch', label: '秒表', icon: 'timer' },
  { key: 'timer', label: '计时器', icon: 'history' },
];

const App = {
  tab: 'alarm',
  viewRoot: null,
  views: {},
  now: null,
  fired: new Set(),

  alarms: [],
  cityIds: [],
  alarmRingtone: 'light',
  timerRingtone: 'light',
  customUrl: null,
  customReady: false,

  /* ---------- 初始化 ---------- */
  init() {
    this.viewRoot = document.getElementById('view');
    this.views = { alarm: AlarmView, world: WorldView, stopwatch: StopwatchView, timer: TimerView };

    this._loadState();
    this._buildNav();
    this._loadCustomRingtone();

    // 首次交互：解锁音频 + 申请通知权限
    const unlock = () => {
      Ringtones.unlock();
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);

    // 自定义铃声变更
    window.addEventListener('clock:custom-ringtone', () => this._loadCustomRingtone());

    // UI 时钟（500ms）：低频更新文本与列表时间
    setInterval(() => {
      this.now = new Date();
      const v = this.views[this.tab];
      if (v && v.tick) v.tick(this.now);
    }, 500);

    // rAF 循环：高频刷新表盘指针（平滑扫秒）
    const smoothLoop = () => {
      const v = this.views[this.tab];
      if (v && v.tickSmooth) v.tickSmooth();
      this._smoothRaf = requestAnimationFrame(smoothLoop);
    };
    requestAnimationFrame(smoothLoop);

    // 闹钟调度引擎（1s）
    setInterval(() => this._schedulerTick(), 1000);

    // 渲染初始标签页
    this.setTab('alarm');
    this.views[this.tab].tick(new Date());

    // PWA
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  },

  _loadState() {
    let saved = Store.loadJSON(Store.LS_KEYS.alarms, null);
    if (Array.isArray(saved)) {
      // 一次性迁移：清除早期版本预置的示例闹钟（seed-*）
      const cleaned = saved.filter((a) => a && String(a.id).indexOf('seed-') !== 0);
      if (cleaned.length !== saved.length) {
        saved = cleaned;
        Store.saveJSON(Store.LS_KEYS.alarms, saved);
      }
    }
    if (Array.isArray(saved)) {
      this.alarms = saved;
    } else {
      // 首次使用：不预置任何闹钟
      this.alarms = [];
      Store.saveJSON(Store.LS_KEYS.alarms, this.alarms);
    }
    const savedCities = Store.loadJSON(Store.LS_KEYS.cities, null);
    if (savedCities === null) {
      this.cityIds = [...DEFAULT_CITY_IDS];
      Store.saveJSON(Store.LS_KEYS.cities, this.cityIds);
    } else {
      this.cityIds = savedCities;
    }
    this.alarmRingtone = Store.loadJSON(Store.LS_KEYS.alarmRingtone, 'light');
    this.timerRingtone = Store.loadJSON(Store.LS_KEYS.timerRingtone, 'light');
  },

  async _loadCustomRingtone() {
    try {
      const blob = await Store.getBlob('custom-ringtone');
      if (blob) {
        if (this.customUrl) URL.revokeObjectURL(this.customUrl);
        this.customUrl = URL.createObjectURL(blob);
        this.customReady = true;
      }
    } catch (e) { /* IndexedDB 不可用时忽略 */ }
  },

  /* ---------- 持久化 ---------- */
  persistAlarms() { Store.saveJSON(Store.LS_KEYS.alarms, this.alarms); },
  persistCities() { Store.saveJSON(Store.LS_KEYS.cities, this.cityIds); },
  setAlarmRingtone(id) { this.alarmRingtone = id; Store.saveJSON(Store.LS_KEYS.alarmRingtone, id); },
  setTimerRingtone(id) { this.timerRingtone = id; Store.saveJSON(Store.LS_KEYS.timerRingtone, id); },

  /* ---------- 闹钟数据操作 ---------- */
  saveAlarm(draft, isEdit) {
    if (isEdit) {
      this.alarms = this.alarms.map((a) => (a.id === draft.id ? draft : a));
    } else {
      this.alarms = [...this.alarms, draft];
    }
    this.persistAlarms();
    AlarmView.renderList();
  },

  removeAlarm(id) {
    this.alarms = this.alarms.filter((a) => a.id !== id);
    this.persistAlarms();
    AlarmView.renderList();
  },

  toggleAlarm(id, enabled) {
    this.alarms = this.alarms.map((a) => (a.id === id ? Object.assign({}, a, { enabled, snoozeUntil: null }) : a));
    this.persistAlarms();
    AlarmView.renderList();
  },

  /* ---------- 标签页 ---------- */
  _buildNav() {
    const sideNav = document.getElementById('sideNav');
    const tabbar = document.getElementById('tabbar');
    sideNav.innerHTML = `<div class="side-tray neo-raised-lg">${TABS.map((t) => `
      <button class="side-btn" data-tab="${t.key}" type="button" aria-label="${t.label}">
        ${Icons[t.icon]}<span>${t.label === '世界时钟' ? '世界<br>时钟' : t.label}</span>
      </button>`).join('')}</div>`;
    tabbar.innerHTML = `<div class="tabbar-tray neo-raised">${TABS.map((t) => `
      <button class="tab-btn" data-tab="${t.key}" type="button" aria-label="${t.label}">
        ${Icons[t.icon]}<span>${t.label}</span>
      </button>`).join('')}</div>`;
    const handler = (e) => {
      const btn = e.target.closest('[data-tab]');
      if (btn) this.setTab(btn.getAttribute('data-tab'));
    };
    sideNav.addEventListener('click', handler);
    tabbar.addEventListener('click', handler);
  },

  setTab(key) {
    if (!this.views[key]) return;
    this.views[this.tab].hide();
    this.tab = key;
    this.views[key].show();
    U.$$('#sideNav .side-btn, #tabbar .tab-btn').forEach((b) => {
      const active = b.getAttribute('data-tab') === key;
      b.classList.toggle('active', active);
      if (active) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    if (this.now && this.views[key].tick) this.views[key].tick(this.now);
  },

  /* ---------- 闹钟调度引擎 ---------- */
  _schedulerTick() {
    const d = new Date();
    const minuteKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}:${d.getMinutes()}`;
    for (const a of this.alarms) {
      if (!a.enabled) continue;
      const key = `${a.id}@${minuteKey}`;
      if (this.fired.has(key)) continue;

      // 贪睡唤醒
      if (a.snoozeUntil) {
        if (Date.now() >= a.snoozeUntil) {
          this.fired.add(key);
          this.alarms = this.alarms.map((x) => (x.id === a.id ? Object.assign({}, x, { snoozeUntil: null }) : x));
          this.persistAlarms();
          AlarmView.renderList();
          this._ring({ type: 'alarm', alarm: Object.assign({}, a, { snoozeUntil: null }) });
          this._notify('闹钟', `${a.label || '闹钟'}（贪睡）`);
        }
        continue;
      }

      if (a.hour === d.getHours() && a.minute === d.getMinutes() && U.matchDay(a, d.getDay())) {
        this.fired.add(key);
        let ringAlarm = a;
        if (a.repeat === 'once') {
          this.alarms = this.alarms.map((x) => (x.id === a.id ? Object.assign({}, x, { enabled: false }) : x));
          this.persistAlarms();
          AlarmView.renderList();
          ringAlarm = Object.assign({}, a, { enabled: false });
        }
        this._ring({ type: 'alarm', alarm: ringAlarm });
        this._notify('闹钟', `${a.label || '闹钟'} ${U.pad2(a.hour)}:${U.pad2(a.minute)}`);
      }
    }
  },

  _ring(ring) {
    this._ringingAlarmId = ring.type === 'alarm' ? ring.alarm.id : null;
    RingOverlay.show(ring, {
      onClose: () => this.closeRing(),
      onSnooze: () => this.snoozeRing(),
    });
    const id = ring.type === 'alarm' ? ring.alarm.ringtone : this.timerRingtone;
    Ringtones.play(id, this.customUrl);
  },

  closeRing() {
    Ringtones.stop();
    RingOverlay.hide();
  },

  snoozeRing() {
    Ringtones.stop();
    RingOverlay.hide();
    if (this._ringingAlarmId) {
      const until = Date.now() + 5 * 60 * 1000;
      this.alarms = this.alarms.map((x) => (x.id === this._ringingAlarmId ? Object.assign({}, x, { snoozeUntil: until }) : x));
      this.persistAlarms();
      AlarmView.renderList();
    }
  },

  _notify(title, body) {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification(title, { body }); } catch (e) { /* 部分环境不支持 */ }
    }
  },

  /* ---------- 计时器到点 ---------- */
  handleTimerDone(totalMs) {
    RingOverlay.show({ type: 'timer' }, { onClose: () => this.closeRing() });
    Ringtones.play(this.timerRingtone, this.customUrl);
    this._notify('计时器', '时间到');
  },
};

App.init();
