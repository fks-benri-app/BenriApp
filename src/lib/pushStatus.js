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
    return onSnapshot(
      doc(db, 'users', studentId),
      (snap) => {
        const v = snap.exists() ? snap.data().pushKey : '';
        setKey(typeof v === 'string' ? v : '');
      },
      (err) => {
        console.warn('[usePushKey] pushKey を読めませんでした', err && err.code);
        setKey('');
      }
    );
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
