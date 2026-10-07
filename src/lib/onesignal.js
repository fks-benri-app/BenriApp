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
 * 通知を許可してもらい、externalId(= studentId)にこの端末をひもづける。
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

// 将来ログアウト機能をつけたときに使う
export async function unsubscribe() {
  await initOneSignal();
  return withOneSignal((OneSignal) => OneSignal.logout());
}
