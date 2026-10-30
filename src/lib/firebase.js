import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
// ★ config.js から firebaseConfig をしっかりインポートします
import { firebaseConfig } from '../config';

// 万が一読み込めていない場合にエラーを分かりやすく表示する保護
if (!firebaseConfig) {
  console.error("【エラー】firebaseConfig が定義されていません。config.js のエクスポートを確認してください。");
}

export const app = initializeApp(firebaseConfig);
// ログインは GAS が発行したカスタムトークンで行う(学校アカウントは外部の Google ログインを使えないため)
// getAuth はポップアップ/リダイレクト用のコードも全部含めてしまうので、カスタムトークンに必要な分だけ指定する。
// 保存先は getAuth の既定(IndexedDB → localStorage)と同じなので、ログイン済みの端末はそのまま引き継がれる
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});
// Firestore は firestoreLazy.js で、必要になったときに読み込む
