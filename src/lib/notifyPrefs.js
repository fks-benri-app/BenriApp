// 通知の設定(全体のオン/オフ、授業ごとのオフ)。users/{生徒ID}.notifyPrefs に保存する。
// 送信は GAS が行うので、GAS も同じ値を見て送るかどうかを決める。
import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export const DEFAULT_PREFS = { enabled: true, offCourses: [] };

// 投稿のリンク(.../c/授業ID/p/投稿ID)から授業IDを取り出す。取れなければ null
export function courseIdOf(link) {
  const m = String(link || '').match(/\/c\/([^/?#]+)/);
  return m ? m[1] : null;
}

// 保存された値を、扱いやすい形にそろえる(未設定なら、すべてオン)
function normalize(p) {
  return {
    enabled: !(p && p.enabled === false),
    offCourses: Array.isArray(p && p.offCourses) ? p.offCourses.filter((x) => typeof x === 'string') : [],
  };
}

export function useNotifyPrefs(studentId) {
  const [state, setState] = useState({ loaded: false, prefs: DEFAULT_PREFS });
  useEffect(() => {
    if (!studentId) return undefined;
    return onSnapshot(
      doc(db, 'users', studentId),
      (snap) => setState({ loaded: true, prefs: normalize(snap.exists() ? snap.data().notifyPrefs : null) }),
      () => setState({ loaded: true, prefs: DEFAULT_PREFS })
    );
  }, [studentId]);
  return state;
}

// 設定を保存する。本人だけが書けるように、Firestore のルールで notifyPrefs だけに限っている
export async function saveNotifyPrefs(studentId, prefs) {
  await updateDoc(doc(db, 'users', studentId), {
    notifyPrefs: { enabled: prefs.enabled !== false, offCourses: prefs.offCourses },
  });
}
