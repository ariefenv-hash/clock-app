'use strict';
/* 铃声引擎 —— Web Audio API 实时合成，无外部音频文件（移植自 lib/clock/ringtones.ts） */

const Ringtones = {
  RINGTONE_LABELS: {
    none: '无铃声',
    light: 'Light',
    happyhour: 'HappyHour',
    amusement: 'AmusementPark',
    flashing: 'Flashing',
    signal: 'Signal',
    custom: '自定义铃声',
  },

  _N: {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
    C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98,
  },

  _patterns: null,

  patterns() {
    if (this._patterns) return this._patterns;
    const N = this._N;
    this._patterns = {
      // 轻盈柔和的风铃式旋律
      light: {
        dur: 3.2,
        notes: [
          { t: 0.0, f: N.C5, d: 0.42, type: 'sine', g: 0.3 },
          { t: 0.0, f: N.E5, d: 0.42, type: 'sine', g: 0.14 },
          { t: 0.5, f: N.E5, d: 0.42, type: 'sine', g: 0.28 },
          { t: 0.5, f: N.G5, d: 0.42, type: 'sine', g: 0.12 },
          { t: 1.0, f: N.G5, d: 0.5, type: 'sine', g: 0.3 },
          { t: 1.0, f: N.C6, d: 0.5, type: 'sine', g: 0.1 },
          { t: 1.6, f: N.E5, d: 0.42, type: 'sine', g: 0.26 },
          { t: 2.1, f: N.D5, d: 0.9, type: 'sine', g: 0.3 },
          { t: 2.1, f: N.G4, d: 0.9, type: 'triangle', g: 0.12 },
        ],
      },
      // 欢快的大调琶音
      happyhour: {
        dur: 1.8,
        notes: [
          { t: 0.0, f: N.C5, d: 0.15, type: 'triangle', g: 0.26 },
          { t: 0.18, f: N.E5, d: 0.15, type: 'triangle', g: 0.26 },
          { t: 0.36, f: N.G5, d: 0.15, type: 'triangle', g: 0.26 },
          { t: 0.54, f: N.C6, d: 0.3, type: 'triangle', g: 0.3 },
          { t: 0.9, f: N.G5, d: 0.15, type: 'triangle', g: 0.24 },
          { t: 1.08, f: N.E5, d: 0.15, type: 'triangle', g: 0.24 },
          { t: 1.26, f: N.C5, d: 0.15, type: 'triangle', g: 0.24 },
          { t: 1.44, f: N.G4, d: 0.3, type: 'triangle', g: 0.26 },
          { t: 0.0, f: N.C4, d: 0.7, type: 'sine', g: 0.16 },
          { t: 0.9, f: N.G4, d: 0.7, type: 'sine', g: 0.14 },
        ],
      },
      // 游乐场般跳跃的快速旋律
      amusement: {
        dur: 2.0,
        notes: [
          { t: 0.0, f: N.E5, d: 0.12, type: 'square', g: 0.1 },
          { t: 0.15, f: N.G5, d: 0.12, type: 'square', g: 0.1 },
          { t: 0.3, f: N.A5, d: 0.12, type: 'square', g: 0.1 },
          { t: 0.45, f: N.C6, d: 0.24, type: 'square', g: 0.12 },
          { t: 0.75, f: N.A5, d: 0.12, type: 'square', g: 0.1 },
          { t: 0.9, f: N.G5, d: 0.3, type: 'square', g: 0.11 },
          { t: 1.25, f: N.A5, d: 0.12, type: 'square', g: 0.1 },
          { t: 1.4, f: N.C6, d: 0.12, type: 'square', g: 0.1 },
          { t: 1.55, f: N.E6, d: 0.3, type: 'square', g: 0.12 },
          { t: 0.0, f: N.C5, d: 0.4, type: 'triangle', g: 0.12 },
          { t: 1.0, f: N.F4, d: 0.4, type: 'triangle', g: 0.12 },
        ],
      },
      // 急促的双声蜂鸣
      flashing: {
        dur: 1.6,
        notes: [
          { t: 0.0, f: N.A5, d: 0.11, type: 'sawtooth', g: 0.12 },
          { t: 0.0, f: N.E5, d: 0.11, type: 'sawtooth', g: 0.08 },
          { t: 0.18, f: N.A5, d: 0.11, type: 'sawtooth', g: 0.12 },
          { t: 0.18, f: N.E5, d: 0.11, type: 'sawtooth', g: 0.08 },
          { t: 0.36, f: N.A5, d: 0.11, type: 'sawtooth', g: 0.12 },
          { t: 0.36, f: N.E5, d: 0.11, type: 'sawtooth', g: 0.08 },
          { t: 0.54, f: N.A5, d: 0.11, type: 'sawtooth', g: 0.12 },
          { t: 0.54, f: N.E5, d: 0.11, type: 'sawtooth', g: 0.08 },
        ],
      },
      // 经典数字闹钟滴滴声
      signal: {
        dur: 1.4,
        notes: [
          { t: 0.0, f: 800, d: 0.09, type: 'sine', g: 0.24 },
          { t: 0.14, f: 800, d: 0.09, type: 'sine', g: 0.24 },
          { t: 0.28, f: 800, d: 0.09, type: 'sine', g: 0.24 },
          { t: 0.42, f: 800, d: 0.09, type: 'sine', g: 0.24 },
          { t: 0.7, f: 640, d: 0.09, type: 'sine', g: 0.2 },
          { t: 0.84, f: 640, d: 0.09, type: 'sine', g: 0.2 },
        ],
      },
    };
    return this._patterns;
  },

  _ctx: null,
  _master: null,
  _loopTimer: null,
  _stopTimer: null,
  _playingId: null,
  _customAudio: null,

  /** 在用户手势中调用以解锁音频上下文 */
  unlock() {
    const ctx = this._ensureCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  },

  _ensureCtx() {
    if (!this._ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this._ctx = new AC();
      this._master = this._ctx.createGain();
      this._master.gain.value = 0.9;
      this._master.connect(this._ctx.destination);
    }
    return this._ctx;
  },

  _beep(at, n) {
    const ctx = this._ctx;
    const master = this._master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type || 'sine';
    osc.frequency.value = n.f;
    const peak = n.g == null ? 0.2 : n.g;
    const attack = 0.012;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(peak, at + attack);
    gain.gain.setValueAtTime(peak, Math.max(at + attack, at + n.d - 0.03));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + n.d);
    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + n.d + 0.06);
  },

  _startSynthLoop(p) {
    const ctx = this._ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.08;
    let cursor = 0;
    const tick = () => {
      if (!this._ctx) return;
      const ahead = this._ctx.currentTime + 0.35;
      while (t0 + cursor < ahead) {
        const base = t0 + cursor;
        for (const n of p.notes) this._beep(base + n.t, n);
        cursor += p.dur;
      }
    };
    tick();
    this._loopTimer = setInterval(tick, 150);
  },

  /** 循环播放铃声 */
  play(id, customUrl) {
    this.stop();
    if (id === 'none') return;
    this._playingId = id;
    if (id === 'custom') {
      if (!customUrl) return;
      const audio = new Audio(customUrl);
      audio.loop = true;
      audio.volume = 1;
      audio.play().catch(() => {});
      this._customAudio = audio;
      return;
    }
    const ctx = this._ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const p = this.patterns()[id];
    if (p) this._startSynthLoop(p);
  },

  /** 试听：播放一个乐句后自动停止 */
  preview(id, customUrl) {
    if (id === 'none') { this.stop(); return; }
    this.play(id, customUrl);
    const dur = id === 'custom'
      ? 6000
      : ((this.patterns()[id] ? this.patterns()[id].dur : 2) * 1000 + 400);
    clearTimeout(this._stopTimer);
    this._stopTimer = setTimeout(() => {
      if (this._playingId === id) this.stop();
    }, dur);
  },

  stop() {
    if (this._loopTimer) { clearInterval(this._loopTimer); this._loopTimer = null; }
    if (this._stopTimer) { clearTimeout(this._stopTimer); this._stopTimer = null; }
    if (this._customAudio) {
      this._customAudio.pause();
      this._customAudio.currentTime = 0;
      this._customAudio = null;
    }
    // 立即静音已排程的音符
    if (this._master && this._ctx) {
      const g = this._master.gain;
      const ctx = this._ctx;
      g.cancelScheduledValues(ctx.currentTime);
      g.setValueAtTime(g.value, ctx.currentTime);
      g.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
      setTimeout(() => {
        try {
          g.setValueAtTime(0.9, this._ctx.currentTime);
          g.linearRampToValueAtTime(0.9, this._ctx.currentTime);
        } catch (e) { /* noop */ }
      }, 80);
    }
    this._playingId = null;
  },
};
