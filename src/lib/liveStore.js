// 購読(onSnapshot)の共有。同じ参照(お知らせ一覧、users/{id} など)は、アプリの中で1つだけ購読する。
// ・画面を離れても購読は止めない。次に開いたとき、覚えてある直近の値をすぐ出す(読み直さない)。
// ・変わったところだけ、Firestore が届けてくる(差分)。
// ・失敗したら間隔をあけて数回だけやり直す。何度やっても駄目なら止める(読み取りの繰り返しを防ぐ)。
import { subscribe, userDoc } from './firestoreLazy';

const MAX_ATTEMPTS = 5;
const entries = new Map(); // key → { makeRef, hasValue, snap, listeners: Set, stop, timer, attempt }

function connect(entry) {
  entry.stop = subscribe(
    entry.makeRef,
    (snap) => {
      entry.attempt = 0;
      entry.hasValue = true;
      entry.snap = snap;
      for (const l of entry.listeners) if (l.onSnap) l.onSnap(snap);
    },
    (err) => {
      if (entry.stop) entry.stop();
      entry.stop = null;
      for (const l of entry.listeners) if (l.onError) l.onError(err);
      if (entry.attempt >= MAX_ATTEMPTS) return;
      const wait = Math.min(30000, 2000 * 2 ** entry.attempt);
      entry.attempt += 1;
      entry.timer = setTimeout(() => connect(entry), wait);
    }
  );
}

/**
 * key の購読に、listener({ onSnap, onError }) を登録する。戻り値は、この listener だけを外す関数。
 * 直近の値が覚えてあれば、登録した時点で onSnap に渡す。
 */
export function watchLive(key, makeRef, listener) {
  let entry = entries.get(key);
  if (!entry) {
    entry = { makeRef, hasValue: false, snap: null, listeners: new Set(), stop: null, timer: null, attempt: 0 };
    entries.set(key, entry);
    connect(entry);
  }
  entry.listeners.add(listener);
  if (entry.hasValue && listener.onSnap) listener.onSnap(entry.snap);
  return () => { entry.listeners.delete(listener); };
}

/** 生徒の users/{id} を監視する(生徒ごとに購読は1つ) */
export function watchUser(studentId, onSnap, onError) {
  return watchLive('user:' + studentId, userDoc(studentId), { onSnap, onError });
}
