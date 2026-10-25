import { CONFIG } from '../config';

window.OneSignalDeferred = window.OneSignalDeferred || [];

const BASE = import.meta.env.BASE_URL; // 例: /classroom-notify/

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// OneSignal SDK は読み込み後にコールバックを呼ぶ方式。Promise で扱えるように包む。
function withOneSignal(fn) {
  return new Promise((resolve, reject) => {
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        resolve(await fn(OneSignal));
      } catch (e) {
        reject(e);
      }
    });
  });
}

let initPromise = null;

// 何度呼んでも init は1回だけ(React の StrictMode でも二重初期化しない)
export function initOneSignal() {
  if (!initPromise) {
    initPromise = withOneSignal((OneSignal) =>
      OneSignal.init({
        appId: CONFIG.ONESIGNAL_APP_ID,
        serviceWorkerPath: `${BASE}OneSignalSDKWorker.js`,
        serviceWorkerParam: { scope: BASE },
      })
    );
  }
  return initPromise;
}

/**
 * 通知を許可してもらい、externalId にこの端末をひもづける。
 * externalId は生徒IDではなく、GAS が作った推測できない値(users/{id}.pushKey)を渡すこと。
 * @returns {{ ok: true } | { ok: false, reason: 'denied' | 'timeout' }}
 */
export async function subscribeAs(externalId) {
  await initOneSignal();
  return withOneSignal(async (OneSignal) => {
    await OneSignal.Notifications.requestPermission();
    if (!OneSignal.Notifications.permission) {
      return { ok: false, reason: 'denied' };
    }

    // 重複ユーザー防止: login の前に既存の匿名ひもづけを解除する
    await OneSignal.logout();
    await OneSignal.login(externalId);

    for (let i = 0; i < 20; i++) {
      if (
        OneSignal.User.PushSubscription.id &&
        OneSignal.User.externalId === externalId
      ) {
        await sleep(1000);
        return { ok: true };
      }
      await sleep(500);
    }
    return { ok: false, reason: 'timeout' };
  });
}

/**
 * 通知を許可ずみの端末で、購読の状態を確認し、ずれていれば付け直す(アプリを開くたびに呼ぶ)。
 * - 通知を許可していない端末には何もしない。
 * - External ID が違う / 空なら、正しい生徒IDでつなぎ直す。
 * - 購読が OFF になっていれば ON に戻す。
 * ※ サーバー側だけで無効になっている場合は、ここでは直せない(GAS が検知して「通知を直す」カードを出す)。
 */
export async function ensureSubscription(externalId) {
  await initOneSignal();
  return withOneSignal(async (OneSignal) => {
    if (!OneSignal.Notifications.permission) return { ok: false, reason: 'no-permission' };
    if (OneSignal.User.externalId !== externalId) {
      await OneSignal.login(externalId);
    }
    if (!OneSignal.User.PushSubscription.optedIn) {
      await OneSignal.User.PushSubscription.optIn();
    }
    return { ok: true };
  });
}

// 将来ログアウト機能をつけたときに使う
export async function unsubscribe() {
  await initOneSignal();
  return withOneSignal((OneSignal) => OneSignal.logout());
}
