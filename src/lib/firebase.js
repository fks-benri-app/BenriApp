import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
// ★ config.js から firebaseConfig をしっかりインポートします
import { firebaseConfig } from '../config';

// 万が一読み込めていない場合にエラーを分かりやすく表示する保護
if (!firebaseConfig) {
  console.error("【エラー】firebaseConfig が定義されていません。config.js のエクスポートを確認してください。");
}

const app = initializeApp(firebaseConfig);
// オフライン時も前に読み込んだお知らせを表示できるよう、端末(IndexedDB)に保存する
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
});
