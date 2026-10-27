// 文字サイズの設定。Class.jsx と Settings.jsx の両方が、ここから基準の大きさを読む
import { storage } from './storage';

export const FONT_SIZES = [
  { label: '小', px: 13 },
  { label: '標準', px: 14 },
  { label: '大', px: 16 },
];

export function currentFontSize() {
  const label = storage.get('fontSizeLabel');
  return FONT_SIZES.find((f) => f.label === label) || FONT_SIZES[1];
}

// 次のサイズに切り替えて保存する(小 → 標準 → 大 → 小)
export function nextFontSize() {
  const cur = currentFontSize();
  const i = FONT_SIZES.findIndex((f) => f.px === cur.px);
  const next = FONT_SIZES[(i + 1) % FONT_SIZES.length];
  storage.set('fontSizeLabel', next.label);
  return next;
}
