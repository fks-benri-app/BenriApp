// 授業ごとの通知の設定(users/{生徒ID}.notifyPrefs.offCourses に、オフの授業IDを入れる)。
// 全体のオン/オフは端末ごとに、OneSignal の購読で決める(lib/onesignal.js)。
import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export const DEFAULT_PREFS = { offCourses: [] };

// 投稿のリンク(.../c/授業ID/p/投稿ID)から授業IDを取り出す。取れなければ null
export function courseIdOf(link) {
  const m = String(link || '').match(/\/c\/([^/?#]+)/);
  return m ? m[1] : null;
}

function normalize(p) {
  return { offCourses: Array.isArray(p && p.offCourses) ? p.offCourses.filter((x) => typeof x === 'string') : [] };
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

// 授業ごとの設定を保存する。本人だけが書けるように、Firestore のルールで notifyPrefs に限っている
export async function saveNotifyPrefs(studentId, prefs) {
  await updateDoc(doc(db, 'users', studentId), { notifyPrefs: { offCourses: prefs.offCourses } });
}
