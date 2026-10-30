// Firestore を、最初に使うときだけ読み込む(起動時の JS を減らすため)。
// 購読や保存は、この subscribe / saveDoc を通す。db は一度だけ作り、以後は同じものを使う。
import { app } from './firebase';

let loading = null;

export function loadFirestore() {
  if (!loading) {
    loading = import('firebase/firestore').then((fs) => {
      // オフライン時も前に読み込んだお知らせを表示できるよう、端末(IndexedDB)に保存する
      const db = fs.initializeFirestore(app, {
        localCache: fs.persistentLocalCache({ tabManager: fs.persistentSingleTabManager({}) }),
      });
      return { fs, db };
    });
    // 読み込みに失敗したら、次に使うときにやり直せるようにする
    loading.catch(() => { loading = null; });
  }
  return loading;
}

/**
 * Firestore を購読する。makeRef({ fs, db }) で参照(doc や query)を作る。
 * 戻り値の関数を呼ぶと、読み込み前でも購読をやめられる。
 */
export function subscribe(makeRef, onSnap, onErr) {
  let unsub = null;
  let cancelled = false;
  loadFirestore()
    .then((env) => {
      if (cancelled) return;
      unsub = env.fs.onSnapshot(makeRef(env), onSnap, onErr);
    })
    .catch((err) => { if (onErr) onErr(err); });
  return () => {
    cancelled = true;
    if (unsub) unsub();
  };
}

// 生徒の users/{id} の参照
export const userDoc = (studentId) => ({ fs, db }) => fs.doc(db, 'users', studentId);

/** users/{id} に書き込む(本人だけが書けるルールになっている項目に限る) */
export async function updateUserDoc(studentId, data) {
  const { fs, db } = await loadFirestore();
  await fs.updateDoc(fs.doc(db, 'users', studentId), data);
}
