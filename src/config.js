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
