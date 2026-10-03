'use strict';
/* 世界时钟视图：本地时钟 + 城市列表（时差/日期） + 城市选择 */

const WorldView = {
  key: 'world',
  root: null,
  refs: {},
  editMode: false,

  build() {
    const root = U.el(`
      <div class="view-root duo">
        <div class="duo-left">
          <div class="analog-host"></div>
          <div style="display:flex;flex-direction:column;align-items:center">
            <p class="dlabel js-local-label">&nbsp;</p>
            <p class="dclock neo-emboss">--:--:--</p>
            <p class="ddate">&nbsp;</p>
          </div>
        </div>
        <div class="duo-right">
          <div class="row-actions">
            <button class="text-btn js-edit" type="button">编辑</button>
            <button class="plus-btn neo-raised-sm neo-press js-add" type="button" aria-label="添加城市">${Icons.plus}</button>
          </div>
          <div class="card-list js-list"></div>
        </div>
      </div>
    `);
    root.querySelector('.js-edit').addEventListener('click', () => {
      this.editMode = !this.editMode;
      root.querySelector('.js-edit').textContent = this.editMode ? '完成' : '编辑';
      this.renderList();
    });
    root.querySelector('.js-add').addEventListener('click', () => this.openPicker());
    this.root = root;
    this.refs = {
      analogHost: root.querySelector('.analog-host'),
      localLabel: root.querySelector('.js-local-label'),
      clock: root.querySelector('.dclock'),
      date: root.querySelector('.ddate'),
      list: root.querySelector('.js-list'),
    };
    // 独立表盘实例（每个视图一份，避免共享单例导致切换标签后指针冻结）
    this.clock = createAnalogClock(this.refs.analogHost, 312);
    this._localTz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Asia/Shanghai';
    const match = CITIES.find((c) => c.tz === this._localTz);
    this.refs.localLabel.textContent = match ? `${match.country}·${match.name}` : '本地时间';
    App.viewRoot.appendChild(root);
    this.renderList();
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
    this._now = now;
    this._paintTimes();
  },

  /** rAF 高频调用：只刷新表盘（平滑扫秒），文本由 tick 低频更新 */
  tickSmooth() {
    if (!this.root || !this.root.classList.contains('active')) return;
    this.clock.update(new Date());
  },

  _paintTimes() {
    const now = this._now || new Date();
    const localOff = U.tzOffsetMinutes(this._localTz, now);
    U.$$('.city-card', this.refs.list).forEach((card) => {
      const city = CITY_MAP[card._cityId];
      if (!city) return;
      const cityDate = U.dateInZone(city.tz, now);
      const diffH = (U.tzOffsetMinutes(city.tz, now) - localOff) / 60;
      card.querySelector('.js-time').textContent = U.formatHM(cityDate);
      card.querySelector('.js-sub').textContent = `${U.formatMD(cityDate)} ${U.diffText(diffH)}`;
    });
  },

  renderList() {
    const list = this.refs.list;
    list.innerHTML = '';
    if (App.cityIds.length === 0) {
      list.appendChild(U.el(`
        <div class="empty neo-inset">
          ${Icons.globe}
          <p class="t">还没有城市</p>
          <p class="s">点击右上角 + 添加一座城市</p>
        </div>
      `));
      return;
    }
    for (const id of App.cityIds) {
      const city = CITY_MAP[id];
      if (!city) continue;
      const card = U.el(`
        <div class="city-card neo-raised neo-lift">
          ${this.editMode ? `<button class="alarm-del neo-raised-sm neo-press" type="button" aria-label="删除${U.esc(city.name)}">${Icons.minus}</button>` : ''}
          <div class="alarm-mid">
            <p class="city-name">${U.esc(city.name)}（${U.esc(city.country)}）</p>
            <p class="city-sub js-sub">&nbsp;</p>
          </div>
          <span class="city-time neo-emboss js-time">--:--</span>
        </div>
      `);
      card._cityId = id;
      const del = card.querySelector('.alarm-del');
      if (del) {
        del.addEventListener('click', () => {
          App.cityIds = App.cityIds.filter((x) => x !== id);
          App.persistCities();
          this.renderList();
        });
      }
      list.appendChild(card);
    }
    this._paintTimes();
  },

  openPicker() {
    const backdrop = U.el(`
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal-panel wide neo-raised-lg" style="display:flex;flex-direction:column;max-height:78vh">
          <h2 class="edit-title">添加城市</h2>
          <div class="search-box neo-inset-sm">
            ${Icons.search}
            <input class="js-q" placeholder="搜索城市或国家">
          </div>
          <div class="picker-list neo-scrollbar js-results"></div>
        </div>
      </div>
    `);
    const q = backdrop.querySelector('.js-q');
    const results = backdrop.querySelector('.js-results');
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    const paint = () => {
      const query = q.value.trim();
      const list = CITIES.filter((c) =>
        !App.cityIds.includes(c.id) &&
        (query === '' || c.name.includes(query) || c.country.includes(query)));
      results.innerHTML = '';
      if (list.length === 0) {
        results.appendChild(U.el('<p style="padding:40px 0;text-align:center;font-size:15px;color:var(--ink-faint)">没有找到匹配的城市</p>'));
        return;
      }
      for (const c of list) {
        const row = U.el(`
          <button class="picker-row" type="button">
            <span><span class="cn">${U.esc(c.name)}</span><span class="co">${U.esc(c.country)}</span></span>
            <span class="tz">${U.esc(c.tz.split('/').pop().replace(/_/g, ' '))}</span>
          </button>
        `);
        row.addEventListener('click', () => {
          App.cityIds = [...App.cityIds, c.id];
          App.persistCities();
          close();
          this.renderList();
        });
        results.appendChild(row);
      }
    };
    q.addEventListener('input', paint);
    paint();
    document.body.appendChild(backdrop);
    q.focus();
  },
};
