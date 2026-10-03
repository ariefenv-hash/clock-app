'use strict';
/* 工具函数与时间逻辑（移植自 lib/clock/time.ts） */

const U = {
  pad2(n) { return String(n).padStart(2, '0'); },
  WEEKDAY_ZH: ['日', '一', '二', '三', '四', '五', '六'],

  /** mm:ss:cc（百分秒） */
  formatStopwatch(ms) {
    const total = Math.max(0, Math.floor(ms / 10));
    const cs = total % 100;
    const s = Math.floor(total / 100) % 60;
    const m = Math.floor(total / 6000);
    return `${U.pad2(m)}:${U.pad2(s)}:${U.pad2(cs)}`;
  },

  /** HH:MM:SS（倒计时向上取整） */
  formatCountdown(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const s = total % 60;
    const m = Math.floor(total / 60) % 60;
    const h = Math.floor(total / 3600);
    return `${U.pad2(h)}:${U.pad2(m)}:${U.pad2(s)}`;
  },

  formatClock(d) { return `${U.pad2(d.getHours())}:${U.pad2(d.getMinutes())}:${U.pad2(d.getSeconds())}`; },
  formatHM(d) { return `${U.pad2(d.getHours())}:${U.pad2(d.getMinutes())}`; },
  formatCnDate(d) { return `${d.getFullYear()}-${U.pad2(d.getMonth() + 1)}-${U.pad2(d.getDate())} 星期${U.WEEKDAY_ZH[d.getDay()]}`; },
  formatMD(d) { return `${U.pad2(d.getMonth() + 1)}-${U.pad2(d.getDate())}`; },

  /** 闹钟重复规则描述 */
  describeRepeat(rule, weekdays) {
    switch (rule) {
      case 'once': return '只响一次';
      case 'daily': return '每天';
      case 'workday': return '工作日';
      case 'weekend': return '休息日';
      case 'custom': {
        if (!weekdays || weekdays.length === 0) return '自定义';
        if (weekdays.length === 7) return '每天';
        const sorted = [...weekdays].sort((a, b) => a - b);
        return sorted.map((d) => `周${U.WEEKDAY_ZH[d]}`).join('、');
      }
      default: return '';
    }
  },

  /** 判断闹钟今天是否应触发 */
  matchDay(alarm, day) {
    switch (alarm.repeat) {
      case 'once':
      case 'daily': return true;
      case 'workday': return day >= 1 && day <= 5;
      case 'weekend': return day === 0 || day === 6;
      case 'custom': return alarm.weekdays.includes(day);
      default: return false;
    }
  },

  /** 某时区在给定时刻的 UTC 偏移（分钟） */
  tzOffsetMinutes(tz, date) {
    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
      const parts = dtf.formatToParts(date);
      const map = {};
      for (const p of parts) {
        if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
      }
      const asUTC = Date.UTC(
        map.year, (map.month || 1) - 1, map.day || 1,
        map.hour === 24 ? 0 : map.hour || 0, map.minute || 0, map.second || 0
      );
      return (asUTC - date.getTime()) / 60000;
    } catch (e) {
      return 0;
    }
  },

  /** 按目标时区拆分出本地化 Date 字段 */
  dateInZone(tz, date) {
    return new Date(date.getTime() + U.tzOffsetMinutes(tz, date) * 60000);
  },

  /** 时差描述：慢X小时 / 快X小时 / 同时区 */
  diffText(diffH) {
    const rounded = Math.round(diffH * 2) / 2;
    if (rounded === 0) return '同时区';
    const sign = rounded > 0 ? '快' : '慢';
    const a = Math.abs(rounded);
    const txt = Number.isInteger(a) && a !== 0.5
      ? `${a}小时`
      : a === 0.5 ? '半小时' : `${Math.floor(a)}个半小时`;
    return `${sign}${txt}`;
  },

  uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; },

  esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  },

  $(sel, el) { return (el || document).querySelector(sel); },
  $$(sel, el) { return Array.from((el || document).querySelectorAll(sel)); },

  /** 生成 0~n 的两位数字符串数组 */
  numberRange(n) { return Array.from({ length: n }, (_, i) => U.pad2(i)); },

  el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  },
};
