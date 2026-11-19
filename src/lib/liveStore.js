// 購読(onSnapshot)の共有。同じ参照(お知らせ一覧、users/{id} など)は、アプリの中で1つだけ購読する。
// ・画面を離れても購読は止めない。次に開いたとき、覚えてある直近の値をすぐ出す(読み直さない)。
// ・変わったところだけ、Firestore が届けてくる(差分)。
// ・失敗したら間隔をあけて数回だけやり直す。何度やっても駄目なら止める(読み取りの繰り返しを防ぐ)。
import { subscribe, userDoc } from './firestoreLazy';
import { storage } from './storage';

// 端末の保存(localStorage)のキー。画面ごとに別々の保存先を作らず、ここだけで持つ。
const STORE_PREFIX = 'live:';

const MAX_ATTEMPTS = 5;
const entries = new Map(); // key → { makeRef, opts, hasValue, snap, value, listeners: Set, stop, timer, attempt }
const memory = new Map(); // key → 画面用に加工した直近の値(購読がまだ値を受け取る前でも、すぐ出せる)

/**
 * 前回の値(画面用に加工したもの)を返す。無ければ null。
 * まず覚えてある値、なければ端末の保存から revive(保存した形 → 画面の形)で戻す。
 */
export function peekLive(key, revive) {
  if (memory.has(key)) return memory.get(key);
  try {
    const raw = JSON.parse(storage.get(STORE_PREFIX + key) || 'null');
    if (raw !== null) {
      const v = revive ? revive(raw) : raw;
      memory.set(key, v);
      return v;
    }
  } catch { /* 壊れていたら無視して、購読で読み直す */ }
  return null;
}

// 加工ずみの値を、メモリと端末に保存する(購読の外から決める値用)
export function rememberValue(key, value) {
  memory.set(key, value);
  try { storage.set(STORE_PREFIX + key, JSON.stringify(value)); } catch { /* 保存できなくても続ける */ }
}

function remember(entry, key, value) {
  memory.set(key, value);
  const { toStored } = entry.opts;
  if (toStored) {
    try { storage.set(STORE_PREFIX + key, JSON.stringify(toStored(value))); } catch { /* 保存できなくても表示は続ける */ }
  }
}


function connect(entry, key) {
  entry.stop = subscribe(
    entry.makeRef,
    (snap) => {
      entry.attempt = 0;
      entry.hasValue = true;
      entry.snap = snap;
      if (entry.opts.derive) {
        entry.value = entry.opts.derive(snap);
        remember(entry, key, entry.value);
      }
      for (const l of entry.listeners) {
        if (l.onSnap) l.onSnap(snap);
        if (l.onValue && entry.opts.derive) l.onValue(entry.value);
      }
    },
    (err) => {
      if (entry.stop) entry.stop();
      entry.stop = null;
      for (const l of entry.listeners) if (l.onError) l.onError(err);
      if (entry.attempt >= MAX_ATTEMPTS) return;
      const wait = Math.min(30000, 2000 * 2 ** entry.attempt);
      entry.attempt += 1;
      entry.timer = setTimeout(() => connect(entry, key), wait);
    }
  );
}

/**
 * key の購読に、listener({ onSnap, onValue, onError }) を登録する。戻り値は、この listener だけを外す関数。
 * 直近の値が覚えてあれば、登録した時点で渡す。
 * opts(最初に購読を作る呼び出しの分だけ使われる):
 *   derive(snap)      スナップショット → 画面用の値。購読ごとに1回だけ計算し、onValue に渡す
 *   toStored(value)   端末に保存する形にする(省略すると端末には保存しない)
 */
export function watchLive(key, makeRef, listener, opts = {}) {
  let entry = entries.get(key);
  if (!entry) {
    entry = { makeRef, opts, hasValue: false, snap: null, value: null, listeners: new Set(), stop: null, timer: null, attempt: 0 };
    entries.set(key, entry);
    connect(entry, key);
  }
  entry.listeners.add(listener);
  if (entry.hasValue) {
    if (listener.onSnap) listener.onSnap(entry.snap);
    if (listener.onValue && entry.opts.derive) listener.onValue(entry.value);
  }
  return () => { entry.listeners.delete(listener); };
}

/**
 * 生徒の users/{id} を監視する(生徒ごとに購読は1つ)。
 * extra.onValue を渡すと、氏名(先頭の学籍番号を外したもの)を受け取る。氏名は端末にも保存して、次回すぐ出す。
 */
export function watchUser(studentId, onSnap, onError, extra = {}) {
  const key = 'user:' + studentId;
  const stripId = (v) => (typeof v === 'string' ? v.replace(/^\d{6}\s*/, '') : '');
  // 氏名は別のキー(user:{id}:name)に、加工ずみの値として持つ
  let off2 = () => {};
  if (extra.onValue) {
    const cached = peekLive(key + ':name');
    if (cached !== null) extra.onValue(cached);
    off2 = watchLive(key, userDoc(studentId), {
      onSnap: (snap) => {
        const name = stripId(snap.exists() ? snap.data().name : '');
        rememberValue(key + ':name', name);
        extra.onValue(name);
      },
    });
  }
  const off1 = onSnap || onError ? watchLive(key, userDoc(studentId), { onSnap, onError }) : () => {};
  return () => { off1(); off2(); };
}
