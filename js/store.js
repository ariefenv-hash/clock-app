'use strict';
/* 本地持久化：localStorage + IndexedDB（自定义铃声 Blob） */

const Store = {
  LS_KEYS: {
    alarms: 'clock.alarms.v1',
    cities: 'clock.cities.v1',
    alarmRingtone: 'clock.ringtone.alarm.v1',
    timerRingtone: 'clock.ringtone.timer.v1',
  },

  loadJSON(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  saveJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* 存储已满等异常忽略 */ }
  },

  _dbPromise: null,

  _openDb() {
    if (this._dbPromise) return this._dbPromise;
    this._dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('clock-pwa-db', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this._dbPromise;
  },

  async putBlob(key, blob) {
    const db = await this._openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('blobs', 'readwrite');
      tx.objectStore('blobs').put(blob, key);
      tx.oncomplete = () => { db.close(); this._dbPromise = null; resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  },

  async getBlob(key) {
    const db = await this._openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('blobs', 'readonly');
      const req = tx.objectStore('blobs').get(key);
      req.onsuccess = () => { db.close(); this._dbPromise = null; resolve(req.result || null); };
      req.onerror = () => reject(req.error);
    });
  },
};
