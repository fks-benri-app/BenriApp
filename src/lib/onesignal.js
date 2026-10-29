import { CONFIG } from '../config';
import { storage } from './storage';

// この端末の通知を、利用者が自分でオフにしたかどうか(オフの間は、自動でオンに戻さない)
const PUSH_OFF_KEY = 'pushOffByUser';
export function isPushOffByUser() {
  return storage.get(PUSH_OFF_KEY) === '1';
}
function setPushOffByUser(off) {
  storage.set(PUSH_OFF_KEY, off ? '1' : '0');
}

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
 * externalId が空(キーがまだ届いていない)ときは、許可と購読の作成だけ行う。
 * ひもづけは、キーが届いたあとに、お知らせ画面が ensureSubscription で自動で行う。
 * @param {() => void} [onPermissionDone] 許可の画面が終わって、登録の待ちに入るときに呼ばれる
 * @returns {{ ok: true, synced: boolean } | { ok: false, reason: 'denied' | 'timeout' }}
 */
export async function subscribeAs(externalId, onPermissionDone) {
  await initOneSignal();
  return withOneSignal(async (OneSignal) => {
    await OneSignal.Notifications.requestPermission();
    if (!OneSignal.Notifications.permission) {
      return { ok: false, reason: 'denied' };
    }
    if (onPermissionDone) onPermissionDone();

    if (externalId) {
      // logout() は、新しい匿名ユーザーを作ってしまう(OneSignal の仕様)。
      // キャッシュを消した直後などは、すでに匿名なので、logout せず login だけにして、空のユーザーを増やさない。
      // login(externalId) だけで、この端末の購読は、その外部IDのユーザーに付け替わる。
      // 別の外部ID(旧方式の生徒IDなど)で登録ずみの端末のときだけ、これまでどおり logout してから login する。
      const current = OneSignal.User.externalId;
      if (current && current !== externalId) {
        await OneSignal.logout();
      }
      if (current !== externalId) {
        await OneSignal.login(externalId);
      }
    } else if (!OneSignal.User.PushSubscription.optedIn) {
      // 連携し直すときは、オフの記録を消して、通知を受け取る状態にする
      setPushOffByUser(false);
      await OneSignal.User.PushSubscription.optIn();
    }

    // 初回(キャッシュを消した直後など)は Service Worker の登録と購読の作成が重なって遅いので、30秒まで待つ
    const startedAt = Date.now();
    for (let i = 0; i < 60; i++) {
      if (
        OneSignal.User.PushSubscription.id &&
        (!externalId || OneSignal.User.externalId === externalId)
      ) {
        await sleep(1000);
        return { ok: true, synced: !!externalId };
      }
      await sleep(500);
    }
    // 原因の調べやすさのため、どこまで進んだかをコンソールに残す
    console.warn('[subscribeAs] timeout', {
      waitedMs: Date.now() - startedAt,
      subscriptionId: OneSignal.User.PushSubscription.id || null,
      externalId: OneSignal.User.externalId || null,
      optedIn: OneSignal.User.PushSubscription.optedIn,
    });
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
    let changed = false;
    if (OneSignal.User.externalId !== externalId) {
      await OneSignal.login(externalId);
      changed = true;
    }
    // 利用者が自分でオフにした端末は、ここでオンに戻さない
    if (!OneSignal.User.PushSubscription.optedIn && !isPushOffByUser()) {
      await OneSignal.User.PushSubscription.optIn();
      changed = true;
    }
    return { ok: true, changed };
  });
}

// この端末の購読ID(無ければ null)。GAS が保存した購読の一覧と見比べて、この端末が無効になっていないか確かめるのに使う
export async function getSubscriptionId() {
  await initOneSignal();
  return withOneSignal((OneSignal) => OneSignal.User.PushSubscription.id || null);
}

// 将来ログアウト機能をつけたときに使う
export async function unsubscribe() {
  await initOneSignal();
  return withOneSignal((OneSignal) => OneSignal.logout());
}

// この端末の通知をオン/オフする。オフにすると、サーバーが送ってもこの端末には届かない(OneSignal 側で止まる)
export async function setDevicePushEnabled(on) {
  await initOneSignal();
  return withOneSignal(async (OneSignal) => {
    setPushOffByUser(!on);
    if (on) await OneSignal.User.PushSubscription.optIn();
    else await OneSignal.User.PushSubscription.optOut();
    return !!OneSignal.User.PushSubscription.optedIn;
  });
}

// この端末の通知が、今オンかどうか
// オフラインでは OneSignal の SDK が読めず、待ち続けてしまうので、時間で打ち切る。
// そのときは、この端末に保存した「オフ」の印で代用する(画面を開けなくしないため)。
const SDK_WAIT_MS = 3000;
export async function getDevicePushEnabled() {
  try {
    return await Promise.race([
      initOneSignal().then(() => withOneSignal((OneSignal) => !!OneSignal.User.PushSubscription.optedIn)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('onesignal timeout')), SDK_WAIT_MS)),
    ]);
  } catch {
    return !isPushOffByUser();
  }
}
