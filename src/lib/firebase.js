import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// ★ config.js から firebaseConfig をしっかりインポートします
import { firebaseConfig } from '../config';

// 万が一読み込めていない場合にエラーを分かりやすく表示する保護
if (!firebaseConfig) {
  console.error("【エラー】firebaseConfig が定義されていません。config.js のエクスポートを確認してください。");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
