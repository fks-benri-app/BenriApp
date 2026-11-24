// 文字サイズ(px)の設定。Class.jsx と Settings.jsx の両方が、ここから基準の大きさを読む
import { useEffect, useState } from 'react';
import { storage } from '../data/storage';

export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 20;
export const FONT_SIZE_DEFAULT = 14;

// 保存されている値を読む。未設定・範囲外・数値でないときはデフォルトに戻す
export function currentFontSize() {
  const n = parseInt(storage.get('fontSizePx'), 10);
  return Number.isInteger(n) && n >= FONT_SIZE_MIN && n <= FONT_SIZE_MAX ? n : FONT_SIZE_DEFAULT;
}

const FONT_EVENT = 'benri:fontsize';

export function setFontSize(px) {
  storage.set('fontSizePx', String(px));
  // 開いている画面にもすぐ知らせる(設定と授業の画面を行き来しなくても反映されるように)
  window.dispatchEvent(new Event(FONT_EVENT));
}

// 文字サイズを、変わったら再描画されるように読む
export function useFontSize() {
  const [px, setPx] = useState(currentFontSize);
  useEffect(() => {
    const update = () => setPx(currentFontSize());
    window.addEventListener(FONT_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(FONT_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return px;
}
