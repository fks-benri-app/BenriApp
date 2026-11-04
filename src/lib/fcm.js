// FCM の登録トークンを取る(段階2の試験用)
// 取ったトークンは、いまは画面に表示するだけ。GAS へ登録する処理は次の段階で入れる。
// 通知の許可は、ボタンを押したとき(ユーザーの操作の中)でしか求められない。ページを開いた時点では求めない。
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import { CONFIG } from '../config';

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
