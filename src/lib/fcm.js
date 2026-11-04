// FCM の登録トークンを取る(段階2の試験用)
// 取ったトークンは、いまは画面に表示するだけ。GAS へ登録する処理は次の段階で入れる。
// 通知の許可は、ボタンを押したとき(ユーザーの操作の中)でしか求められない。ページを開いた時点では求めない。
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app } from './firebase';
import { CONFIG, isGasConfigured } from '../config';

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

// 登録トークンを GAS に保存してもらう(GAS が、その生徒の所属授業のトピックへ購読させる)。
// pushKey は、ログイン時に決まった値(users/{生徒ID}.pushKey)。GAS がこれを照合して、本人の端末だけを受け付ける。
// GET で送るので、トークンは URL に入る。ログや画面には出さない。
export async function registerFcmTokenToGas(studentId, pushKey, token) {
  if (!isGasConfigured()) throw new Error('GAS_URL が未設定です');
  const query = new URLSearchParams({ action: 'registerFcm', studentId, pushKey, token }).toString();
  const res = await fetch(`${CONFIG.GAS_URL}?${query}`);
  const json = await res.json().catch(() => null);
  if (!json || !json.ok) throw new Error('GAS への登録に失敗しました');
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
