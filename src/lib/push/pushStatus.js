// 通知が届いていない可能性の判定。GAS が書いた状態を読むだけ。
import { watchUser } from '../data/liveStore';
import { useEffect, useState } from 'react';

// 通知が端末に届いていない可能性があるか。
// GAS が通知を送ったとき、登録トークンが1つも無ければ users/{studentId}.pushBroken を true にし、
// 送れたら false に戻す。ここではそれを読むだけ(書き込みは GAS だけ)。
export function usePushBroken(studentId) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    if (!studentId) return undefined;
    return watchUser(studentId,
      (snap) => setBroken(!!(snap.exists() && snap.data().pushBroken === true)),
      () => setBroken(false)
    );
  }, [studentId]);
  return broken;
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
