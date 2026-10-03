'use strict';
/* 闹钟视图：列表 + 编辑器（时间滚轮 / 重复 / 铃声 / 贪睡） */

const REPEAT_OPTIONS = [
  { key: 'once', label: '只响一次' },
  { key: 'daily', label: '每天' },
  { key: 'workday', label: '工作日' },
  { key: 'weekend', label: '休息日' },
  { key: 'custom', label: '自定义' },
];

const AlarmView = {
  key: 'alarm',
  root: null,
  refs: {},
  editMode: false,

  build() {
    const root = U.el(`
      <div class="view-root duo">
        <div class="duo-left">
          <div class="analog-host"></div>
          <div style="display:flex;flex-direction:column;align-items:center">
            <p class="dclock neo-emboss">--:--:--</p>
            <p class="ddate">&nbsp;</p>
          </div>
        </div>
        <div class="duo-right">
          <div class="row-actions">
            <button class="text-btn js-edit" type="button">编辑</button>
            <button class="plus-btn neo-raised-sm neo-press js-add" type="button" aria-label="添加">${Icons.plus}</button>
          </div>
          <div class="card-list js-list"></div>
        </div>
      </div>
    `);
    root.querySelector('.js-edit').addEventListener('click', () => {
      this.editMode = !this.editMode;
      this.paintHeader();
      this.renderList();
    });
    root.querySelector('.js-add').addEventListener('click', () => this.openEditor(null, false));
    this.root = root;
    this.refs = {
      analogHost: root.querySelector('.analog-host'),
      clock: root.querySelector('.dclock'),
      date: root.querySelector('.ddate'),
      editBtn: root.querySelector('.js-edit'),
      list: root.querySelector('.js-list'),
    };
    // 独立表盘实例（每个视图一份，避免共享单例导致切换标签后指针冻结）
    this.clock = createAnalogClock(this.refs.analogHost, 312);
    App.viewRoot.appendChild(root);
    this.renderList();
    this.paintHeader();
  },

  show() {
    if (!this.root) this.build();
    this.root.classList.add('active');
  },
  hide() { if (this.root) this.root.classList.remove('active'); },

  tick(now) {
    if (!this.root || !this.root.classList.contains('active')) return;
    this.clock.update(now);
    this.refs.clock.textContent = U.formatClock(now);
    this.refs.date.textContent = U.formatCnDate(now);
  },

  /** rAF 高频调用：只刷新表盘（平滑扫秒），文本由 tick 低频更新 */
  tickSmooth() {
    if (!this.root || !this.root.classList.contains('active')) return;
    this.clock.update(new Date());
  },

  paintHeader() {
    this.refs.editBtn.textContent = this.editMode ? '完成' : '编辑';
  },

  renderList() {
    const list = this.refs.list;
    list.innerHTML = '';
    const alarms = App.alarms;
    if (alarms.length === 0) {
      list.appendChild(U.el(`
        <div class="empty neo-inset">
          ${Icons.alarm}
          <p class="t">还没有闹钟</p>
          <p class="s">点击右上角 + 新建一个</p>
        </div>
      `));
      return;
    }
    for (const a of alarms) {
      const card = U.el(`
        <div class="alarm-card neo-raised neo-lift ${a.enabled ? '' : 'off'}" role="button" tabindex="0">
          ${this.editMode ? `<button class="alarm-del neo-raised-sm neo-press" type="button" aria-label="删除闹钟">${Icons.minus}</button>` : ''}
          <div class="alarm-mid">
            <p class="alarm-name">${U.esc(a.label || '闹钟')}</p>
            <p class="alarm-sub">闹钟<br>${a.snoozeUntil ? '贪睡中' : U.describeRepeat(a.repeat, a.weekdays)}</p>
          </div>
          <span class="alarm-time neo-emboss">${U.pad2(a.hour)}:${U.pad2(a.minute)}</span>
          <div class="js-switch-host"></div>
        </div>
      `);
      const sw = this._makeSwitch(a.enabled, (v) => App.toggleAlarm(a.id, v));
      card.querySelector('.js-switch-host').appendChild(sw);
      const open = () => { if (!this.editMode) this.openEditor(a, true); };
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') open(); });
      const delBtn = card.querySelector('.alarm-del');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          App.removeAlarm(a.id);
        });
      }
      list.appendChild(card);
    }
  },

  _makeSwitch(checked, onChange) {
    const sw = U.el(`<button class="nswitch" type="button" role="switch" aria-checked="${!!checked}"><span class="nswitch-thumb"></span></button>`);
    sw.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(v));
      onChange(v);
    });
    return sw;
  },

  /** 编辑器弹窗（draft 为本地副本，保存时写回） */
  openEditor(alarm, isEdit) {
    const draft = alarm
      ? Object.assign({}, alarm, { weekdays: [...alarm.weekdays] })
      : {
          id: U.uid(),
          hour: 8, minute: 0, enabled: true, label: '闹钟',
          repeat: 'once', weekdays: [],
          ringtone: App.alarmRingtone,
          snooze: false, snoozeUntil: null,
        };

    const backdrop = U.el(`
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal-panel neo-raised-lg neo-scrollbar">
          <h2 class="edit-title">${isEdit ? '编辑闹钟' : '新建闹钟'}</h2>
          <div class="wheel-tray neo-inset">
            <div class="wheel-band neo-raised-sm" aria-hidden="true"></div>
            <div class="js-wheels" style="display:flex;align-items:center;gap:16px"></div>
          </div>
          <div class="edit-row neo-inset-sm">
            <span class="lbl">标签</span>
            <input class="js-label" maxlength="12" placeholder="闹钟名称" value="${U.esc(draft.label)}">
          </div>
          <div class="edit-row col neo-inset-sm">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span class="lbl">重复</span>
              <span class="hint js-repeat-desc"></span>
            </div>
            <div class="pills js-pills"></div>
            <div class="wd-row js-wd" style="display:none"></div>
          </div>
          <button class="edit-row as-btn neo-inset-sm js-ring" type="button">
            <span class="lbl">铃声</span>
            <span class="val"><span class="js-ring-name">Light</span>${Icons.chev}</span>
          </button>
          <div class="edit-row neo-inset-sm" style="margin-bottom:0">
            <span class="lbl">贪睡（5分钟）</span>
            <span class="js-snooze-host"></span>
          </div>
          <div class="edit-foot">
            ${isEdit ? '<button class="btn-pill neo-ghost danger js-del" type="button">删除</button>' : ''}
            <button class="btn-pill neo-ghost js-cancel" type="button">取消</button>
            <button class="btn-pill wide neo-cta js-save" type="button">保存</button>
          </div>
        </div>
      </div>
    `);

    const wheelsHost = backdrop.querySelector('.js-wheels');
    const hours = U.numberRange(24);
    const minutes = U.numberRange(60);
    // eslint-disable-next-line no-new
    new WheelPicker(wheelsHost, {
      values: hours, index: draft.hour, width: 120, height: 196, itemHeight: 52,
      onChange: (i) => { draft.hour = i; },
    });
    // eslint-disable-next-line no-new
    new WheelPicker(wheelsHost, {
      values: minutes, index: draft.minute, width: 120, height: 196, itemHeight: 52,
      onChange: (i) => { draft.minute = i; },
    });

    const labelInput = backdrop.querySelector('.js-label');
    labelInput.value = draft.label;
    labelInput.addEventListener('input', () => { draft.label = labelInput.value; });

    const descEl = backdrop.querySelector('.js-repeat-desc');
    const pillsEl = backdrop.querySelector('.js-pills');
    const wdEl = backdrop.querySelector('.js-wd');
    const paintRepeat = () => {
      descEl.textContent = U.describeRepeat(draft.repeat, draft.weekdays);
      pillsEl.innerHTML = '';
      for (const opt of REPEAT_OPTIONS) {
        const on = draft.repeat === opt.key;
        const b = U.el(`<button class="pill ${on ? 'neo-raised-sm on' : ''}" type="button">${opt.label}</button>`);
        b.addEventListener('click', () => {
          draft.repeat = opt.key;
          paintRepeat();
        });
        pillsEl.appendChild(b);
      }
      if (draft.repeat === 'custom') {
        wdEl.style.display = 'flex';
        wdEl.innerHTML = '';
        for (const d of [1, 2, 3, 4, 5, 6, 0]) {
          const on = draft.weekdays.includes(d);
          const btn = U.el(`<button class="wd-btn ${on ? 'on' : ''}" type="button" aria-pressed="${on}">${d === 0 ? '日' : U.WEEKDAY_ZH[d]}</button>`);
          btn.addEventListener('click', () => {
            draft.weekdays = on
              ? draft.weekdays.filter((x) => x !== d)
              : [...draft.weekdays, d];
            paintRepeat();
          });
          wdEl.appendChild(btn);
        }
      } else {
        wdEl.style.display = 'none';
      }
    };
    paintRepeat();

    const ringNameEl = backdrop.querySelector('.js-ring-name');
    ringNameEl.textContent = Ringtones.RINGTONE_LABELS[draft.ringtone] || 'Light';
    backdrop.querySelector('.js-ring').addEventListener('click', () => {
      openRingtoneModal({
        value: draft.ringtone,
        customReady: App.customReady,
        onSelect: (id) => {
          draft.ringtone = id;
          ringNameEl.textContent = Ringtones.RINGTONE_LABELS[id] || 'Light';
        },
      });
    });

    const snoozeHost = backdrop.querySelector('.js-snooze-host');
    snoozeHost.appendChild(this._makeSwitch(draft.snooze, (v) => { draft.snooze = v; }));

    const close = () => backdrop.remove();
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    backdrop.querySelector('.js-cancel').addEventListener('click', close);
    const delBtn = backdrop.querySelector('.js-del');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        App.removeAlarm(draft.id);
        close();
      });
    }
    backdrop.querySelector('.js-save').addEventListener('click', () => {
      App.saveAlarm(draft, isEdit);
      close();
    });

    document.body.appendChild(backdrop);
  },
};
