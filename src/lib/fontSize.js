// 文字サイズ(px)の設定。Class.jsx と Settings.jsx の両方が、ここから基準の大きさを読む
import { storage } from './storage';

export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 20;
export const FONT_SIZE_DEFAULT = 14;

// 保存されている値を読む。未設定・範囲外・数値でないときはデフォルトに戻す
export function currentFontSize() {
  const n = parseInt(storage.get('fontSizePx'), 10);
  return Number.isInteger(n) && n >= FONT_SIZE_MIN && n <= FONT_SIZE_MAX ? n : FONT_SIZE_DEFAULT;
}

export function setFontSize(px) {
  storage.set('fontSizePx', String(px));
}
