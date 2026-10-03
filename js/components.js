'use strict';
/* 共享组件：图标 / 模拟时钟（工厂）/ 秒表表盘（工厂）/ 循环滚轮选择器 */

function svgWrap(inner, sw) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

const Icons = {
  plus: svgWrap('<path d="M5 12h14M12 5v14"/>', 2),
  minus: svgWrap('<path d="M5 12h14"/>', 2.4),
  search: svgWrap('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  chev: svgWrap('<path d="m9 18 6-6-6-6"/>'),
  bell: svgWrap('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  alarm: svgWrap('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/>'),
  globe: svgWrap('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'),
  timer: svgWrap('<path d="M10 2h4"/><path d="m12 14 3-3"/><circle cx="12" cy="14" r="8"/>'),
  history: svgWrap('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'),
};

/* ============ 模拟时钟（工厂：每个视图持有独立实例，避免共享状态导致指针冻结） ============
   凸起表圈 + 凹陷秒弧轨道槽 + 瓷面表盘 + 60 分刻度 + 锥形剑形指针 + 玻璃高光 + 平滑扫秒（毫秒精度） */
function createAnalogClock(host, displaySize) {
  const C = 190;           // 表盘中心（viewBox 380x380，四周留足阴影空间）
  const ARC_R = 139;       // 秒弧轨道半径（凹槽中线）
  // 实例级唯一 id 前缀：多实例 SVG 同屏时避免 defs/filter 引用冲突
  const U2 = 'ck' + Math.random().toString(36).slice(2, 8);

  host.innerHTML = `
    <svg width="${displaySize}" height="${displaySize}" viewBox="0 0 380 380" role="img" aria-label="模拟时钟" style="display:block" shape-rendering="geometricPrecision">
      <defs>
        <linearGradient id="${U2}-bezel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f9fbff"/><stop offset="48%" stop-color="#eaeff6"/><stop offset="100%" stop-color="#d5dbec"/>
        </linearGradient>
        <linearGradient id="${U2}-groove" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(146,159,186,0.36)"/><stop offset="55%" stop-color="rgba(146,159,186,0.10)"/><stop offset="100%" stop-color="rgba(255,255,255,0.9)"/>
        </linearGradient>
        <linearGradient id="${U2}-rim" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="rgba(126,139,166,0.45)"/><stop offset="48%" stop-color="rgba(126,139,166,0.06)"/><stop offset="100%" stop-color="rgba(255,255,255,0.9)"/>
        </linearGradient>
        <radialGradient id="${U2}-sheen" gradientUnits="userSpaceOnUse" cx="${C - 52}" cy="${C - 64}" r="150">
          <stop offset="0%" stop-color="rgba(255,255,255,0.34)"/><stop offset="45%" stop-color="rgba(255,255,255,0.10)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <radialGradient id="${U2}-face" cx="42%" cy="36%" r="78%">
          <stop offset="0%" stop-color="#f5f8fd"/><stop offset="62%" stop-color="#e9edf4"/><stop offset="100%" stop-color="#dde2ee"/>
        </radialGradient>
        <filter id="${U2}-shadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="9" dy="11" stdDeviation="13" flood-color="#9dabc5" flood-opacity="0.5"/>
          <feDropShadow dx="-8" dy="-7" stdDeviation="12" flood-color="#ffffff" flood-opacity="0.95"/>
        </filter>
      </defs>

      <!-- 凸起外壳与水晶座 -->
      <circle cx="${C}" cy="${C}" r="152" fill="url(#${U2}-bezel)" filter="url(#${U2}-shadow)"/>
      <circle cx="${C}" cy="${C}" r="151" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.5"/>
      <circle cx="${C}" cy="${C}" r="148.5" fill="none" stroke="rgba(146,159,186,0.26)" stroke-width="1"/>

      <!-- 凹陷秒弧轨道槽 -->
      <circle cx="${C}" cy="${C}" r="${ARC_R}" fill="none" stroke="url(#${U2}-groove)" stroke-width="18"/>
      <circle cx="${C}" cy="${C}" r="${ARC_R + 9}" fill="none" stroke="rgba(146,159,186,0.22)" stroke-width="1"/>
      <circle cx="${C}" cy="${C}" r="${ARC_R - 9}" fill="none" stroke="rgba(146,159,186,0.26)" stroke-width="1"/>
      <path id="${U2}-arc" d="" fill="none" stroke="rgba(224,122,95,0.5)" stroke-width="7" stroke-linecap="round" style="filter:drop-shadow(0 1px 2px rgba(224,122,95,0.35))"/>
      <circle id="${U2}-dot" r="5.5" fill="#e07a5f" style="filter:drop-shadow(0 2px 3px rgba(224,122,95,0.5))" visibility="hidden"/>

      <!-- 瓷面表盘（内缘渐变明暗 = 凹陷感） -->
      <circle cx="${C}" cy="${C}" r="126" fill="url(#${U2}-face)"/>
      <circle cx="${C}" cy="${C}" r="125" fill="none" stroke="url(#${U2}-rim)" stroke-width="2.6"/>

      <!-- 刻度与数字 -->
      ${_clockTicks(C)}
      <g fill="#3a4152" font-size="26" font-weight="500" text-anchor="middle">
        <text x="${C}" y="${C - 85}" dominant-baseline="central">12</text>
        <text x="${C + 85}" y="${C}" dominant-baseline="central">3</text>
        <text x="${C}" y="${C + 85}" dominant-baseline="central">6</text>
        <text x="${C - 85}" y="${C}" dominant-baseline="central">9</text>
      </g>

      <!-- 玻璃高光（径向渐变，无硬边界） -->
      <circle cx="${C}" cy="${C}" r="125" fill="url(#${U2}-sheen)"/>

      <!-- 指针：锥形剑形（时/分）+ 陶土针（秒），局部坐标系旋转 + CSS drop-shadow 投影 -->
      <g style="filter:drop-shadow(1.5px 3px 2.6px rgba(126,139,166,0.5))">
        <g transform="translate(${C} ${C})">
          <g id="${U2}-h">
            <path d="M 0 -74 C 2 -48 5 -17 5 8 A 5 5 0 0 1 -5 8 C -5 -17 -2 -48 0 -74 Z" fill="#343b4b"/>
            <line x1="0" y1="-64" x2="0" y2="4" stroke="rgba(255,255,255,0.22)" stroke-width="1.1" stroke-linecap="round"/>
          </g>
        </g>
        <g transform="translate(${C} ${C})">
          <g id="${U2}-m">
            <path d="M 0 -98 C 1.6 -70 3.8 -20 3.8 9 A 3.8 3.8 0 0 1 -3.8 9 C -3.8 -20 -1.6 -70 0 -98 Z" fill="#343b4b"/>
            <line x1="0" y1="-88" x2="0" y2="5" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linecap="round"/>
          </g>
        </g>
        <g transform="translate(${C} ${C})">
          <g id="${U2}-s">
            <line x1="0" y1="30" x2="0" y2="-108" stroke="#e07a5f" stroke-width="2.6" stroke-linecap="round"/>
            <circle cx="0" cy="18" r="4.6" fill="#e07a5f"/>
            <circle cx="0" cy="18" r="1.7" fill="rgba(255,255,255,0.55)"/>
          </g>
        </g>
      </g>

      <!-- 轴心（机加工同轴环 + 高光点） -->
      <circle cx="${C}" cy="${C}" r="7.8" fill="#343b4b"/>
      <circle cx="${C}" cy="${C}" r="7.8" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
      <circle cx="${C}" cy="${C}" r="4.4" fill="#e07a5f"/>
      <circle cx="${C - 1.3}" cy="${C - 1.3}" r="1.4" fill="rgba(255,255,255,0.75)"/>
    </svg>`;

  const q = (id) => host.querySelector('#' + id);
  const refs = { arc: q(U2 + '-arc'), dot: q(U2 + '-dot'), h: q(U2 + '-h'), m: q(U2 + '-m'), s: q(U2 + '-s') };
  const pt = (deg, r) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [+(C + r * Math.cos(rad)).toFixed(2), +(C + r * Math.sin(rad)).toFixed(2)];
  };

  return {
    /** now: Date —— 毫秒精度平滑扫秒（指针在局部坐标系内旋转，角度保留 3 位小数） */
    update(now) {
      const ms = now ? now.getMilliseconds() : 0;
      const s = (now ? now.getSeconds() : 0) + ms / 1000;
      const m = (now ? now.getMinutes() : 8) + s / 60;
      const h = ((now ? now.getHours() : 10) % 12) + m / 60;
      const secA = s * 6;
      refs.h.setAttribute('transform', `rotate(${(h * 30).toFixed(3)})`);
      refs.m.setAttribute('transform', `rotate(${(m * 6).toFixed(3)})`);
      refs.s.setAttribute('transform', `rotate(${secA.toFixed(3)})`);
      if (s < 0.03) {
        refs.arc.setAttribute('d', '');
        refs.dot.setAttribute('visibility', 'hidden');
      } else {
        const [ax, ay] = pt(secA, ARC_R);
        const large = secA > 180 ? 1 : 0;
        refs.arc.setAttribute('d', `M ${C} ${C - ARC_R} A ${ARC_R} ${ARC_R} 0 ${large} 1 ${ax} ${ay}`);
        refs.dot.setAttribute('cx', ax);
        refs.dot.setAttribute('cy', ay);
        refs.dot.setAttribute('visibility', 'visible');
      }
    },
  };
}

function _clockTicks(C) {
  let out = '';
  for (let i = 0; i < 60; i++) {
    const main = i % 5 === 0;
    const a = ((i * 6 - 90) * Math.PI) / 180;
    const r1 = main ? 103 : 110.5;
    const r2 = 117;
    out += `<line x1="${(C + r1 * Math.cos(a)).toFixed(2)}" y1="${(C + r1 * Math.sin(a)).toFixed(2)}" x2="${(C + r2 * Math.cos(a)).toFixed(2)}" y2="${(C + r2 * Math.sin(a)).toFixed(2)}" stroke="${main ? '#3c4354' : 'rgba(73,82,105,0.55)'}" stroke-width="${main ? 3.4 : 1.5}" stroke-linecap="round"/>`;
  }
  return out;
}

/* ============ 秒表表盘（工厂）：瓷面外壳 + 凹陷进度轨道 + 锥形陶土指针 + 60 刻度数字 ============ */
function createStopwatchDial(host, displaySize) {
  const C = 190;      // 表壳中心
  const CY = 206;
  const ARC_R = 115;  // 进度轨道半径（与刻度带同轴）
  const U2 = 'sw' + Math.random().toString(36).slice(2, 8);

  host.innerHTML = `
    <svg width="${displaySize}" height="${displaySize}" viewBox="0 0 380 380" role="img" aria-label="秒表" style="display:block" shape-rendering="geometricPrecision">
      <defs>
        <linearGradient id="${U2}-bezel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f9fbff"/><stop offset="48%" stop-color="#eaeff6"/><stop offset="100%" stop-color="#d4dae9"/>
        </linearGradient>
        <linearGradient id="${U2}-btn" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f3f6fb"/><stop offset="100%" stop-color="#d2d9e7"/>
        </linearGradient>
        <linearGradient id="${U2}-groove" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(146,159,186,0.36)"/><stop offset="55%" stop-color="rgba(146,159,186,0.12)"/><stop offset="100%" stop-color="rgba(255,255,255,0.9)"/>
        </linearGradient>
        <linearGradient id="${U2}-rim" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="rgba(126,139,166,0.45)"/><stop offset="48%" stop-color="rgba(126,139,166,0.06)"/><stop offset="100%" stop-color="rgba(255,255,255,0.9)"/>
        </linearGradient>
        <radialGradient id="${U2}-sheen" gradientUnits="userSpaceOnUse" cx="${C - 50}" cy="${CY - 62}" r="150">
          <stop offset="0%" stop-color="rgba(255,255,255,0.34)"/><stop offset="45%" stop-color="rgba(255,255,255,0.10)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <radialGradient id="${U2}-face" cx="42%" cy="36%" r="78%">
          <stop offset="0%" stop-color="#f4f7fc"/><stop offset="62%" stop-color="#e8ecf4"/><stop offset="100%" stop-color="#dbe0ec"/>
        </radialGradient>
        <filter id="${U2}-shadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="9" dy="12" stdDeviation="14" flood-color="#9dabc5" flood-opacity="0.52"/>
          <feDropShadow dx="-8" dy="-7" stdDeviation="12" flood-color="#ffffff" flood-opacity="0.95"/>
        </filter>
      </defs>

      <!-- 顶部按钮（实心 + 顶棱高光 + 凹槽纹理 + 颈座） -->
      <g style="filter:drop-shadow(2px 3px 3px rgba(146,159,186,0.45))">
        <rect x="174" y="14" width="32" height="28" rx="10" fill="url(#${U2}-btn)"/>
        <rect x="174" y="14" width="32" height="28" rx="10" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1"/>
        <line x1="180" y1="17.5" x2="200" y2="17.5" stroke="rgba(255,255,255,0.8)" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="181" y1="24" x2="199" y2="24" stroke="rgba(146,159,186,0.4)" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="181" y1="24.5" x2="199" y2="24.5" stroke="rgba(255,255,255,0.75)" stroke-width="0.8" stroke-linecap="round"/>
        <line x1="181" y1="31" x2="199" y2="31" stroke="rgba(146,159,186,0.4)" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="181" y1="31.5" x2="199" y2="31.5" stroke="rgba(255,255,255,0.75)" stroke-width="0.8" stroke-linecap="round"/>
        <rect x="181" y="40" width="18" height="20" rx="6" fill="url(#${U2}-btn)"/>
      </g>

      <!-- 右上斜按钮（从壳后伸出） -->
      <g transform="rotate(34 276 84)" style="filter:drop-shadow(2px 3px 3px rgba(146,159,186,0.45))">
        <rect x="260" y="66" width="32" height="36" rx="11" fill="url(#${U2}-btn)"/>
        <rect x="260" y="66" width="32" height="36" rx="11" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="1"/>
        <line x1="267" y1="78" x2="285" y2="78" stroke="rgba(146,159,186,0.35)" stroke-width="1.6" stroke-linecap="round"/>
      </g>

      <!-- 表壳与表盘（内缘渐变明暗 = 凹陷感） -->
      <circle cx="${C}" cy="${CY}" r="152" fill="url(#${U2}-bezel)" filter="url(#${U2}-shadow)"/>
      <circle cx="${C}" cy="${CY}" r="151" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.5"/>
      <circle cx="${C}" cy="${CY}" r="148.5" fill="none" stroke="rgba(146,159,186,0.26)" stroke-width="1"/>
      <circle cx="${C}" cy="${CY}" r="132" fill="url(#${U2}-face)"/>
      <circle cx="${C}" cy="${CY}" r="131" fill="none" stroke="url(#${U2}-rim)" stroke-width="2.6"/>

      <!-- 凹陷进度轨道槽 + 陶土进度弧 -->
      <circle cx="${C}" cy="${CY}" r="${ARC_R}" fill="none" stroke="url(#${U2}-groove)" stroke-width="16"/>
      <circle cx="${C}" cy="${CY}" r="${ARC_R + 8}" fill="none" stroke="rgba(146,159,186,0.2)" stroke-width="1"/>
      <circle cx="${C}" cy="${CY}" r="${ARC_R - 8}" fill="none" stroke="rgba(146,159,186,0.24)" stroke-width="1"/>
      <path id="${U2}-arc" d="" fill="none" stroke="rgba(224,122,95,0.55)" stroke-width="6" stroke-linecap="round" style="filter:drop-shadow(0 1px 2px rgba(224,122,95,0.35))"/>

      <!-- 刻度与数字 -->
      ${_stopwatchTicks(C, CY)}
      <g fill="#3a4152" font-size="23" font-weight="500" text-anchor="middle">
        <text x="${C}" y="${CY - 72}" dominant-baseline="central">60</text>
        <text x="${C + 72}" y="${CY}" dominant-baseline="central">15</text>
        <text x="${C}" y="${CY + 72}" dominant-baseline="central">30</text>
        <text x="${C - 72}" y="${CY}" dominant-baseline="central">45</text>
      </g>

      <!-- 玻璃高光（径向渐变，无硬边界） -->
      <circle cx="${C}" cy="${CY}" r="131" fill="url(#${U2}-sheen)"/>

      <!-- 锥形陶土指针（局部坐标系旋转） -->
      <g style="filter:drop-shadow(1.5px 3px 2.6px rgba(126,139,166,0.5))">
        <g transform="translate(${C} ${CY})">
          <g id="${U2}-hand">
            <path d="M 0 -100 C 1.7 -58 3.4 -16 3.4 9 A 3.4 3.4 0 0 1 -3.4 9 C -3.4 -16 -1.7 -58 0 -100 Z" fill="#e07a5f"/>
            <line x1="0" y1="-90" x2="0" y2="4" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linecap="round"/>
          </g>
        </g>
      </g>

      <!-- 轴心 -->
      <circle cx="${C}" cy="${CY}" r="7.2" fill="#343b4b"/>
      <circle cx="${C}" cy="${CY}" r="7.2" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>
      <circle cx="${C}" cy="${CY}" r="4.2" fill="#e07a5f"/>
      <circle cx="${C - 1.2}" cy="${CY - 1.2}" r="1.3" fill="rgba(255,255,255,0.75)"/>
    </svg>`;

  const hand = host.querySelector('#' + U2 + '-hand');
  const arc = host.querySelector('#' + U2 + '-arc');

  return {
    /** progress: 0~1，指针在一分钟内转过的比例（局部坐标系旋转，角度保留 3 位小数） */
    update(progress) {
      const angle = progress * 360;
      hand.setAttribute('transform', `rotate(${angle.toFixed(3)})`);
      if (progress <= 0.001) {
        arc.setAttribute('d', '');
        return;
      }
      const rad = ((angle - 90) * Math.PI) / 180;
      const ax = +(C + ARC_R * Math.cos(rad)).toFixed(2);
      const ay = +(CY + ARC_R * Math.sin(rad)).toFixed(2);
      const large = angle > 180 ? 1 : 0;
      arc.setAttribute('d', `M ${C} ${CY - ARC_R} A ${ARC_R} ${ARC_R} 0 ${large} 1 ${ax} ${ay}`);
    },
  };
}

function _stopwatchTicks(C, CY) {
  let out = '';
  for (let i = 0; i < 60; i++) {
    const a = ((i * 6 - 90) * Math.PI) / 180;
    const long = i % 5 === 0;
    const r1 = long ? 91 : 99;
    const r2 = 105;
    out += `<line x1="${(C + r1 * Math.cos(a)).toFixed(2)}" y1="${(CY + r1 * Math.sin(a)).toFixed(2)}" x2="${(C + r2 * Math.cos(a)).toFixed(2)}" y2="${(CY + r2 * Math.sin(a)).toFixed(2)}" stroke="${long ? '#4a5266' : 'rgba(139,147,166,0.7)'}" stroke-width="${long ? 2.8 : 1.3}" stroke-linecap="round"/>`;
  }
  return out;
}

/* ============ 循环滚轮选择器 ============ */
class WheelPicker {
  /**
   * opts: { values, index, unit, width, height, itemHeight, onChange }
   */
  constructor(parent, opts) {
    this.values = opts.values;
    this.len = this.values.length;
    this.itemHeight = opts.itemHeight || 58;
    this.width = opts.width || 132;
    this.height = opts.height || 238;
    this.onChange = opts.onChange || function () {};
    this.lastEmitted = -1;
    this.settleTimer = null;
    this.destroyed = false;

    const root = document.createElement('div');
    root.className = 'wheel';
    root.style.width = this.width + 'px';
    root.style.height = this.height + 'px';

    const scroller = document.createElement('div');
    scroller.className = 'wheel-scroll no-scrollbar';
    const padH = (this.height - this.itemHeight) / 2;
    scroller.innerHTML = `<div style="height:${padH}px;flex:none"></div>`;
    this.itemEls = [];
    for (let c = 0; c < 3; c++) {
      for (let i = 0; i < this.len; i++) {
        const item = document.createElement('div');
        item.className = 'wheel-item';
        item.style.height = this.itemHeight + 'px';
        item.textContent = this.values[i];
        item._abs = c * this.len + i;
        scroller.appendChild(item);
        this.itemEls.push(item);
      }
    }
    const padB = document.createElement('div');
    padB.style.height = padH + 'px';
    padB.style.flex = 'none';
    scroller.appendChild(padB);
    root.appendChild(scroller);

    if (opts.unit) {
      const u = document.createElement('span');
      u.className = 'wheel-unit';
      u.textContent = opts.unit;
      root.appendChild(u);
    }
    parent.appendChild(root);
    this.root = root;
    this.scroller = scroller;

    this._onScroll = () => this._handleScroll();
    scroller.addEventListener('scroll', this._onScroll, { passive: true });
    scroller.addEventListener('click', (e) => {
      const item = e.target.closest('.wheel-item');
      if (!item) return;
      this._scrollTo(item._abs * this.itemHeight, true);
    });

    // 初始定位（等一帧布局完成后）
    const target = this.len + (opts.index || 0);
    requestAnimationFrame(() => {
      if (this.destroyed) return;
      scroller.scrollTop = target * this.itemHeight;
      this._paint(target);
      this.lastEmitted = ((target % this.len) + this.len) % this.len;
    });
  }

  _norm(i) { return ((i % this.len) + this.len) % this.len; }

  _scrollTo(top, smooth) {
    this.scroller.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  }

  _handleScroll() {
    const el = this.scroller;
    const idx = Math.round(el.scrollTop / this.itemHeight);
    this._paint(idx);
    const n = this._norm(idx);
    if (this.lastEmitted !== n) {
      this.lastEmitted = n;
      this.onChange(n);
    }
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      if (this.destroyed) return;
      const i = Math.round(el.scrollTop / this.itemHeight);
      // 滚动结束后把位置归一到中段拷贝，实现无限循环
      if (i < this.len) this._scrollTo((i + this.len) * this.itemHeight, false);
      else if (i >= this.len * 2) this._scrollTo((i - this.len) * this.itemHeight, false);
    }, 160);
  }

  _paint(active) {
    for (const item of this.itemEls) {
      const dist = Math.abs(item._abs - active);
      item.classList.toggle('w0', dist === 0);
      item.classList.toggle('w1', dist === 1);
      item.classList.toggle('w2', dist === 2);
      item.classList.toggle('w3', dist === 3);
      item.classList.toggle('wf', dist > 3);
    }
  }

  /** 外部设置选中值 */
  setIndex(i) {
    const cur = Math.round(this.scroller.scrollTop / this.itemHeight);
    const target = this.len + this._norm(i);
    const jump = cur === 0 || Math.abs(cur - target) > this.len;
    this._scrollTo(target * this.itemHeight, !jump);
  }

  getIndex() { return this._norm(Math.round(this.scroller.scrollTop / this.itemHeight)); }

  destroy() {
    this.destroyed = true;
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.scroller.removeEventListener('scroll', this._onScroll);
    this.root.remove();
  }
}
