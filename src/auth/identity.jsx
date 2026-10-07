/**
 * 「このアプリを使っているのは誰か」を一手に引き受けるモジュール。
 *
 * 現在: GAS から ?studentId=XXXXXX で渡された値を信じる(ログインなし)。
 * 将来: Firebase Auth などのログインを入れる場合は、このファイルの中身だけを
 *       差し替える。アプリの他の部分は useIdentity() しか使わないので影響を受けない。
 *
 * useIdentity() が返す形(将来も変えない約束):
 *   identity: null | { id: string, source: 'student-id-link' | 将来 'firebase' など }
 *   signOut(): void
 */
import { createContext, useContext, useMemo, useState } from 'react';
import { KEYS, storage } from '../lib/storage';

// 学年コード3桁 + 組1桁 + 出席番号2桁 = 6桁
const STUDENT_ID_PATTERN = /^\d{6}$/;

const IdentityContext = createContext(null);

// URL から studentId を取り込み、すぐURLから消す(履歴やスクショにIDを残さない)。
// 何回呼ばれても同じ結果になるようにしてある(StrictMode対策)。
function loadIdentity() {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  if (params.get('reset') === '1') {
    storage.clearAll(); // 開発用: ?reset=1 で端末側の状態を初期化
  }

  const fromUrl = params.get('studentId');
  if (fromUrl && STUDENT_ID_PATTERN.test(fromUrl)) {
    if (storage.get(KEYS.studentId) !== fromUrl) {
      storage.set(KEYS.studentId, fromUrl);
      storage.remove(KEYS.notifyDoneFor); // 別の生徒に切り替わったら通知設定もやり直す
    }
  }

  if (params.has('studentId') || params.has('reset')) {
    params.delete('studentId');
    params.delete('reset');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  const id = storage.get(KEYS.studentId);
  return id && STUDENT_ID_PATTERN.test(id)
    ? { id, source: 'student-id-link' }
    : null;
}

export function IdentityProvider({ children }) {
  const [identity, setIdentity] = useState(loadIdentity);

  const value = useMemo(
    () => ({
      identity,
      signOut() {
        storage.clearAll();
        setIdentity(null);
      },
    }),
    [identity]
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
