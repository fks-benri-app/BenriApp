/**
 * 「このアプリを使っているのは誰か」を一手に引き受けるモジュール。
 *
 * 現在: GAS(学校アカウントで動く)が発行した Firebase のカスタムトークンでログインする。
 *       トークンは連携画面から戻るときに、URL の #token=… で渡される。uid = 生徒ID(6桁)。
 *       ログインの状態は Firebase Auth が端末に保存するので、毎回の再ログインは要らない。
 * 他の部分は useIdentity() しか使わないので、ここだけ差し替えれば済む。
 *
 * useIdentity() が返す形:
 *   ready: boolean  … ログイン状態の確認が終わったか(終わるまで画面を出さない)
 *   identity: null | { id: string, source: 'firebase' }
 *   signOut(): Promise<void>
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { KEYS, storage } from '../lib/storage';

// 学年コード3桁 + 組1桁 + 出席番号2桁 = 6桁
const STUDENT_ID_PATTERN = /^\d{6}$/;

const IdentityContext = createContext(null);

// URL の #token=… を取り込み、すぐ URL から消す(履歴やスクショにトークンを残さない)。
// HashRouter が # 以降をルートとして読む前に消す必要があるので、読み込み時に1回だけ実行する。
function takeLoginToken() {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  if (params.get('reset') === '1') {
    storage.clearAll(); // 開発用: ?reset=1 で端末側の状態を初期化
  }

  let token = null;
  const m = url.hash.match(/^#token=([A-Za-z0-9._-]+)$/);
  if (m) token = m[1];

  // 古い連携画面が付ける ?studentId= は、もう使わない(URL からだけ消す)
  const hadParams = params.has('studentId') || params.has('reset');
  if (token || hadParams) {
    params.delete('studentId');
    params.delete('reset');
    const hash = token ? '' : url.hash;
    window.history.replaceState(null, '', url.pathname + (params.toString() ? '?' + params : '') + hash);
  }
  return token;
}

const PENDING_TOKEN = takeLoginToken();

// 端末に保存されたログインの読み込み → (トークンがあれば)ログイン。アプリ全体で1回だけ。
const authBoot = (async () => {
  await auth.authStateReady();
  if (PENDING_TOKEN) {
    try {
      await signInWithCustomToken(auth, PENDING_TOKEN);
    } catch (e) {
      console.error('ログインに失敗しました', e);
    }
  }
})();

function studentIdOf(user) {
  return user && STUDENT_ID_PATTERN.test(user.uid) ? user.uid : null;
}

export function IdentityProvider({ children }) {
  const [state, setState] = useState({ ready: false, id: null });

  useEffect(() => {
    let alive = true;
    let booted = false;

    const apply = (user) => {
      if (!alive) return;
      const id = studentIdOf(user);
      if (id && storage.get(KEYS.studentId) !== id) {
        storage.set(KEYS.studentId, id);
        storage.remove(KEYS.notifyDoneFor); // 別の生徒に切り替わったら通知設定もやり直す
      }
      setState({ ready: true, id });
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (booted) apply(user);
    });
    authBoot.then(() => {
      booted = true;
      apply(auth.currentUser);
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      ready: state.ready,
      identity: state.id ? { id: state.id, source: 'firebase' } : null,
      async signOut() {
        storage.clearAll();
        await firebaseSignOut(auth);
        setState({ ready: true, id: null });
      },
    }),
    [state]
  );

  return (
    <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
  );
}

export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentity は IdentityProvider の内側で使ってください');
  return ctx;
}
