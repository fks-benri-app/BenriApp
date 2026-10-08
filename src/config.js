// ここだけ書き換えれば環境が変わっても対応できるように、設定値は全部ここに集める。
export const CONFIG = {
  // OneSignal の App ID は公開されても問題ない値(REST APIキーは絶対にここへ書かない)
  ONESIGNAL_APP_ID: '726063a2-acd8-4d5d-9ff0-98902924cfe1',

  // GAS ウェブアプリのデプロイURL(「デプロイを管理」からコピー)
  GAS_URL: 'https://script.google.com/a/macros/g.nagano-c.ed.jp/s/AKfycbwrd_6ENel5PrSCeV8CzNZh1d200460-b_7O5Vb7o7Z8aZMe2bYDhkGSOIRDQ7rR6gm/exec',
};

export function isGasConfigured() {
  return !CONFIG.GAS_URL.includes('【');
}

// アカウント選択画面を挟んでから GAS を開く。
// 複数のGoogleアカウントでログイン中でも、生徒に学校アカウントを選ばせるため。
export function buildGasLoginUrl() {
  return (
    'https://accounts.google.com/AccountChooser?continue=' +
    encodeURIComponent(CONFIG.GAS_URL)
  );
}
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB6FxgxqrCvcGQavTVJ05PIDN4wqXXWv18",
  authDomain: "fks-benri-application.firebaseapp.com",
  projectId: "fks-benri-application",
  storageBucket: "fks-benri-application.firebasestorage.app",
  messagingSenderId: "468419846692",
  appId: "1:468419846692:web:7cadd33d2f98268cceeeb1",
  measurementId: "G-7BDKG7QBBK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
