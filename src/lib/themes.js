import { storage } from './storage';

// 色のテーマ(グラデーション+その上の文字色)。LinkPage と Class で共通に使う
// 新しい色を足すときは、ここに1行足すだけ
export const THEMES = {
  red: { gradient: 'linear-gradient(110deg, #D83242 0%, #F65B65 100%)', textColor: 'white' },
  shuiro: { gradient: 'linear-gradient(110deg, #E4473D 0%, #FF766C 100%)', textColor: 'white' },
  orangeRed: { gradient: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', textColor: 'white' },
  orange: { gradient: 'linear-gradient(110deg, #D96B25 0%, #F9A45A 100%)', textColor: 'white' },
  amber: { gradient: 'linear-gradient(110deg, #C58A25 0%, #F0BD59 100%)', textColor: 'white' },
  yellow: { gradient: 'linear-gradient(110deg, #B59A2D 0%, #E5D36A 100%)', textColor: 'white' },
  lime: { gradient: 'linear-gradient(110deg, #789F35 0%, #B1D36B 100%)', textColor: 'white' },
  green: { gradient: 'linear-gradient(110deg, #287D4B 0%, #5DB77B 100%)', textColor: 'white' },
  emerald: { gradient: 'linear-gradient(110deg, #26785A 0%, #59B291 100%)', textColor: 'white' },
  teal: { gradient: 'linear-gradient(110deg, #247B76 0%, #57B5AA 100%)', textColor: 'white' },
  cyan: { gradient: 'linear-gradient(110deg, #207C96 0%, #56BCD0 100%)', textColor: 'white' },
  blue: { gradient: 'linear-gradient(110deg, #2D60B4 0%, #6995E4 100%)', textColor: 'white' },
  indigo: { gradient: 'linear-gradient(110deg, #444CA0 0%, #7B83CE 100%)', textColor: 'white' },
  violet: { gradient: 'linear-gradient(110deg, #6943A4 0%, #9D7BD0 100%)', textColor: 'white' },
  pink: { gradient: 'linear-gradient(110deg, #B63870 0%, #E777A0 100%)', textColor: 'white' },
  gray: { gradient: 'linear-gradient(110deg, #676767 0%, #797979 100%)', textColor: 'white' },
  //def: { gradient: 'glay', textColor: 'black' }
};

// ==================================================
// ダークモード(画面の配色)
// 設定画面で切り替え、html 要素の data-theme に反映する。styles.css がそれを見て配色を変える。
// アクセント色(上の THEMES)とは別に、明るさだけを管理する。
// ==================================================

const DARK_MODE_KEY = 'darkMode';

export function isDarkMode() {
  return storage.get(DARK_MODE_KEY) === '1';
}

// 保存された設定を html 要素へ反映する(起動時に一度呼ぶ)
export function applyTheme() {
  const dark = isDarkMode();
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  applyBrowserBarColor(dark);
}

// PWA / ブラウザの一番上(ステータスバー)の色。ヘッダーの背景(styles.css の --surface)と同じ色にそろえる
const BAR_COLOR = { light: '#FFFFFF', dark: '#1f1f23' };
function applyBrowserBarColor(dark) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? BAR_COLOR.dark : BAR_COLOR.light);
  // iOS の PWA は、起動時に読まれる。ダークでは黒系のバーにする
  const ios = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (ios) ios.setAttribute('content', dark ? 'black' : 'default');
}

// 切り替えて保存し、新しい状態(true = ダーク)を返す
export function toggleDarkMode() {
  const next = !isDarkMode();
  storage.set(DARK_MODE_KEY, next ? '1' : '0');
  applyTheme();
  return next;
}
