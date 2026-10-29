// ホーム画面のガジェットの並び順を、この端末に保存する。
// 保存するのは「ガジェットIDの並び」だけ。中身(部品)は src/gadgets/index.js の登録簿にある。
import { storage } from './storage';

const KEY = 'homeLayout';
export const DEFAULT_LAYOUT = ['classNotices'];

// validIds: 登録簿にあるID。保存された並びから、存在しないIDと重複を取り除いて返す。
export function loadLayout(validIds) {
  const valid = new Set(validIds);
  try {
    const saved = JSON.parse(storage.get(KEY) || 'null');
    if (Array.isArray(saved)) {
      const seen = new Set();
      return saved.filter((id) => valid.has(id) && !seen.has(id) && seen.add(id));
    }
  } catch { /* 壊れていたら初期の並びに戻す */ }
  return DEFAULT_LAYOUT.filter((id) => valid.has(id));
}

export function saveLayout(ids) {
  storage.set(KEY, JSON.stringify(ids));
}

// ガジェットを末尾に足す / 外す(追加・削除の画面ができたら、ここを呼ぶ)
export function addGadget(ids, id) {
  return ids.includes(id) ? ids : [...ids, id];
}
export function removeGadget(ids, id) {
  return ids.filter((x) => x !== id);
}
