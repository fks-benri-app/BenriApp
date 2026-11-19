// ダークモード(画面の配色)。設定画面で切り替え、html 要素の data-theme に反映する。
// styles.css がそれを見て配色を変える。授業の色(themes.json)とは別に、明るさだけを管理する。
import { storage } from '../data/storage';

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
