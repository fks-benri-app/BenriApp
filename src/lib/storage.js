// localStorage を直接触らず、このファイル経由にする。
// (Safari のプライベートモード等で例外が出ても画面が落ちないようにする / キー名を一箇所に集める)
const PREFIX = 'cn:';

export const KEYS = {
  studentId: 'studentId',
  notifyDoneFor: 'notifyDoneFor', // 通知設定を完了した studentId
};

export const storage = {
  get(key) {
    try {
      return localStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch {
      /* 保存できなくても動作は続ける */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* noop */
    }
  },
  clearAll() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* noop */
    }
  },
};

export function isNotifyDone(id) {
  return !!id && storage.get(KEYS.notifyDoneFor) === id;
}

export function markNotifyDone(id) {
  storage.set(KEYS.notifyDoneFor, id);
}
