import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

/**
 * 通知が端末に届いていない可能性があるか。
 * GAS が通知を送ったとき、送り先が見つからなければ users/{studentId}.pushBroken を true にし、
 * 送れたら false に戻す。ここではそれを読むだけ(書き込みは GAS だけ)。
 */
export function usePushBroken(studentId) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    if (!studentId) return undefined;
    return onSnapshot(
      doc(db, 'users', studentId),
      (snap) => setBroken(!!(snap.exists() && snap.data().pushBroken === true)),
      () => setBroken(false)
    );
  }, [studentId]);
  return broken;
}

/**
 * OneSignal の External ID に使う、推測できない値(users/{studentId}.pushKey)。
 * GAS が「秘密の文字列 + 生徒ID」から作って保存する。生徒IDそのものを External ID にすると、
 * 他人のIDを指定するだけで他人の通知を受け取れてしまうため。
 * ※ Firestore のルールで、本人だけが読めることが前提(users/{id} は本人のみ)。
 * 値がまだ無いときは空文字を返す(GAS の保存待ち)。
 */
export function usePushKey(studentId) {
  const [key, setKey] = useState('');
  useEffect(() => {
    if (!studentId) {
      setKey('');
      return undefined;
    }
    // 読み込みが一度失敗すると、onSnapshot の監視はそこで終わってしまい、キーが永遠に届かなくなる。
    // 通信の不調や、ログイン直後の一時的な失敗のことがあるため、間隔をあけて監視をやり直す。
    let stopped = false;
    let timer = null;
    let unsubscribe = () => {};
    let attempt = 0;

    const listen = () => {
      unsubscribe = onSnapshot(
        doc(db, 'users', studentId),
        (snap) => {
          attempt = 0;
          const v = snap.exists() ? snap.data().pushKey : '';
          if (typeof v === 'string' && v) {
            setKey(v);
            return;
          }
          setKey('');
          // サーバーから読めているのにキーが無い = GAS が保存に失敗している(ログインし直すと再保存される)
          if (!snap.metadata.fromCache) {
            console.warn('[usePushKey] users/' + studentId + ' に pushKey がありません(GAS の保存失敗の可能性)');
          }
        },
        (err) => {
          console.warn('[usePushKey] pushKey を読めませんでした。やり直します', err && err.code);
          // すでに届いているキーは、そのまま残す
          if (stopped) return;
          const wait = Math.min(30000, 2000 * 2 ** attempt);
          attempt += 1;
          timer = setTimeout(listen, wait);
        }
      );
    };
    listen();

    return () => {
      stopped = true;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [studentId]);
  return key;
}

// 通知を付け直した直後は「通知を直す」を出さない。
// pushBroken は GAS が次に通知を送ったときにしか戻らないため、直しても、しばらくカードが残ってしまう。
// 時間が過ぎても GAS が「届いていない」と判断し続けていれば、また出る。
const FIXED_KEY = 'cn:pushFixedAt';
const FIXED_HIDE_MS = 6 * 60 * 60 * 1000;

export function markPushFixed() {
  try { localStorage.setItem(FIXED_KEY, String(Date.now())); } catch { /* 保存できなくても動く */ }
}

export function isPushRecentlyFixed() {
  try {
    const t = Number(localStorage.getItem(FIXED_KEY));
    return t > 0 && Date.now() - t < FIXED_HIDE_MS;
  } catch { return false; }
}

// 修復ページ(public/repair.html)へ移動する
export function goRepairNotifications() {
  window.location.href = import.meta.env.BASE_URL + 'repair.html';
}
