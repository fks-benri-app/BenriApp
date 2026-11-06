// FCM の登録トークンを取る(段階2の試験用)
// 取ったトークンは、ログイン済みなら users/{生徒ID}/fcmTokens に保存する(GAS が読む)。
// 通知の許可は、ボタンを押したとき(ユーザーの操作の中)でしか求められない。ページを開いた時点では求めない。
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app } from './firebase';
import { CONFIG } from '../config';
import { saveFcmTokenRemote, deleteFcmTokenRemote } from './firestoreLazy';
import { isPushOffByUser } from './onesignal';

const BASE = import.meta.env.BASE_URL; // 例: /BenriApp/

// 端末がこの方法で通知を受けられるか(ブラウザ・iPhone のホーム画面の状態を含む)
export async function fcmSupported() {
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

// 通知を許可してもらい、登録トークンを返す。ボタンのクリックの中から呼ぶこと
export async function requestFcmToken() {
  if (!('Notification' in window)) throw new Error('この端末では通知を使えません');
  if (!(await fcmSupported())) throw new Error('この端末・ブラウザは FCM に対応していません(iPhone はホーム画面から開いてください)');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('通知が許可されませんでした');

  // FCM 専用の Service Worker を、/BenriApp/fcm/ のスコープで登録する(OneSignal の SW とは分ける)
  const registration = await navigator.serviceWorker.register(`${BASE}fcm/firebase-messaging-sw.js`, {
    scope: `${BASE}fcm/`,
  });
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: CONFIG.FCM_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error('登録トークンを取れませんでした');
  return token;
}

// 登録トークンを、本人の users/{生徒ID}/fcmTokens に保存する(GAS が読んで、授業のトピックへ購読させる)。
// Firestore のルールで、ログイン中の本人の端末だけが書ける。GAS の URL も pushKey も使わない。
export async function registerFcmToken(studentId, token) {
  await saveFcmTokenRemote(studentId, token);
  return true;
}

// 通知が許可済みの端末だけ、登録トークンを取り直して保存する(updatedAt が新しくなる)。
// 許可していない端末では、何もしない(許可のダイアログは出さない)。
export async function refreshFcmTokenIfGranted(studentId) {
  if (!studentId) return false;
  if (isPushOffByUser()) return false; // 利用者がこの端末の通知をオフにしている
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  if (!(await fcmSupported())) return false;
  // 許可済みなので、ここでは Service Worker を登録するだけ(許可のダイアログは出ない)
  const registration = await navigator.serviceWorker.register(`${BASE}fcm/firebase-messaging-sw.js`, {
    scope: `${BASE}fcm/`,
  });
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: CONFIG.FCM_VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return false;
  await registerFcmToken(studentId, token);
  return true;
}

// この端末の登録トークンを消す(利用者が通知をオフにしたとき)。消すと、FCM はこの端末に送らない
export async function removeFcmTokenForThisDevice(studentId) {
  if (!studentId || !(await fcmSupported())) return false;
  const registration = await navigator.serviceWorker.getRegistration(`${BASE}fcm/`);
  if (!registration) return false;
  const token = await getToken(getMessaging(app), { vapidKey: CONFIG.FCM_VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return false;
  await deleteFcmTokenRemote(studentId, token);
  return true;
}

// アプリを開いている間に届いた通知を、画面の通知として出す。
// (開いているときは、SDK が自動で表示しないため)。戻り値は購読を止める関数。
export async function listenForegroundMessages() {
  if (!(await fcmSupported())) return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const data = payload.data || {};
    const title = payload.notification?.title || data.title || 'お知らせ';
    const body = payload.notification?.body || data.body || '';
    const url = data.docId
      ? `${location.origin}${BASE}?open=${encodeURIComponent(data.docId)}`
      : `${location.origin}${BASE}`;
    navigator.serviceWorker
      .getRegistration(`${BASE}fcm/`)
      .then((reg) => {
        // SW 経由で出すと、通知を押したときに SW が url を開く(ページの外でも動く)
        if (reg) return reg.showNotification(title, { body, tag: data.docId || undefined, data: { url } });
        return new Notification(title, { body });
      })
      .catch(() => {});
  });
}
