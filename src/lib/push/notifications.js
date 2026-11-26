// 通知の設定の窓口。授業ごとの設定と、この端末のオン/オフをここで扱う。
import { watchUser } from '../data/liveStore';
// 通知の設定(users/{生徒ID}.notifyPrefs)。
// ・offCourses: オフの授業ID
// ・remindAssignment: 課題の期限の知らせ。何日前に知らせるか(daysBefore)
// ・remindUnread: 未読のお知らせの再通知。受け取ってから何時間後に知らせるか(afterHours)
//
// 通知の設定は、このファイルが唯一の入口。
//   1. 授業ごとの設定(Firestore の notifyPrefs)  … useNotifyPrefs / saveNotifyPrefs
//   2. この端末のオン/オフ(FCM の登録トークン + 利用者のオフの印)  … getDevicePushEnabled / setDevicePushEnabled
import { useEffect, useState } from 'react';
import { updateUserDoc } from '../data/firestoreLazy';
import { isPushOffByUser, setPushOffByUser } from './pushOffFlag';

export { isPushOffByUser };

export const DAY_OPTIONS = [1, 2, 3];
export const HOUR_OPTIONS = [12, 24, 72];

export const DEFAULT_PREFS = {
  offCourses: [],
  remindAssignment: { on: true, daysBefore: 1 },
  remindUnread: { on: true, afterHours: 24 },
};

// 授業 ID は、リンクでは base64 になっていることがある。数字の授業 ID に直す(数字のままなら、そのまま)
export function decodeCourseId(s) {
  if (/^\d+$/.test(s)) return s;
  try {
    return atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  } catch {
    return s;
  }
}

// 投稿のリンク(.../c/授業ID/p/投稿ID)から授業IDを取り出す。取れなければ null
export function courseIdOf(link) {
  const m = String(link || '').match(/\/c\/([^/?#]+)/);
  return m ? decodeCourseId(m[1]) : null;
}

// 形式がおかしい値は、既定値に戻す
export function normalizePrefs(p) {
  const a = (p && p.remindAssignment) || {};
  const u = (p && p.remindUnread) || {};
  return {
    offCourses: Array.isArray(p && p.offCourses) ? [...new Set(p.offCourses.filter((x) => typeof x === 'string').map(decodeCourseId))] : [],
    remindAssignment: {
      on: a.on !== false,
      daysBefore: DAY_OPTIONS.includes(a.daysBefore) ? a.daysBefore : 1,
    },
    remindUnread: {
      on: u.on !== false,
      afterHours: HOUR_OPTIONS.includes(u.afterHours) ? u.afterHours : 24,
    },
  };
}

export function useNotifyPrefs(studentId) {
  const [state, setState] = useState({ loaded: false, prefs: DEFAULT_PREFS });
  useEffect(() => {
    if (!studentId) return undefined;
    return watchUser(studentId,
      (snap) => setState({ loaded: true, prefs: normalizePrefs(snap.exists() ? snap.data().notifyPrefs : null) }),
      () => setState({ loaded: true, prefs: DEFAULT_PREFS })
    );
  }, [studentId]);
  return state;
}

// 通知の設定を保存する。本人だけが書けるように、Firestore のルールで notifyPrefs に限っている
export async function saveNotifyPrefs(studentId, prefs) {
  await updateUserDoc(studentId, { notifyPrefs: normalizePrefs(prefs) });
}

// この端末の通知が今オンか(許可済みで、利用者がオフにしていないか)
export async function getDevicePushEnabled() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  return !isPushOffByUser();
}

// オン/オフを切り替える。戻り値は、切り替えたあとの状態(オンなら true)。
// オフ: 利用者のオフの印を立て、FCM の登録トークンを消す(消すと FCM はこの端末に送らない)。
// オン: オフの印を外し、FCM の登録トークンを取り直して保存する。
// オンにするときは、許可がまだなら許可を求める(再連携のあとなど、許可が未設定の端末で何も起きないのを防ぐ)。
// 許可が拒否されていたら、オンにできない(戻り値は false)。
export async function setDevicePushEnabled(studentId, on) {
  const fcm = await import('./fcm');
  try {
    if (on) {
      setPushOffByUser(false);
      await fcm.enableFcmForStudent(studentId);
    } else {
      setPushOffByUser(true);
      await fcm.removeFcmTokenForThisDevice(studentId);
    }
  } catch (e) {
    console.warn('[setDevicePushEnabled]', e);
  }
  return getDevicePushEnabled();
}

// 通知の許可が、ブラウザで拒否されているか
export function isPushDenied() {
  return typeof Notification !== 'undefined' && Notification.permission === 'denied';
}
