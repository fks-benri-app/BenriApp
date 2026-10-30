// ガジェットの登録簿。設定は gadgets.json に書く(中身の部品は components.js)。
//
// gadgets.json の項目(大きさ・位置は、基準の列数 BASE_COLS での値。画面の列数に合わせて自動で換算される):
//   id          保存に使う名前。変えない。重複不可
//   type        部品の名前(components.js にあるもの)
//   title       枠の見出し
//   path        タップしたときに開く画面(省略すると、タップしても何も起きない)
//   initial     true: 初めて開いたときから置く
//   addable     true: ガジェットの追加画面から追加できる(その画面は今後作る。省略時は true)
//   defaultPos  初めて置くときの位置と大きさ(x, y, w, h)
//   min / max   大きさの範囲(w, h)。max.w は BASE_COLS まで
// 形式がおかしい項目は、読み飛ばして、コンソールに理由を出す(画面が壊れないように)。

import gadgetsJson from './gadgets.json';
import { COMPONENTS } from './components';
import { BASE_COLS, BASE_ROWS } from '../lib/homeLayout';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function normalize(raw, seen) {
  const name = raw && typeof raw.id === 'string' ? raw.id : '(id なし)';
  const fail = (why) => {
    console.warn(`[gadgets.json] ${name}: ${why} のため無視します`);
    return null;
  };
  if (!raw || typeof raw !== 'object') return fail('形式が正しくない');
  if (typeof raw.id !== 'string' || !raw.id) return fail('id がない');
  if (seen.has(raw.id)) return fail('id が重複している');
  if (!COMPONENTS[raw.type]) return fail(`type「${raw.type}」は未対応`);
  if (typeof raw.title !== 'string' || !raw.title) return fail('title がない');

  const min = raw.min || {};
  const max = raw.max || {};
  const minW = min.w ?? 2;
  const maxW = max.w ?? BASE_COLS;
  const minH = min.h ?? 2;
  const maxH = max.h ?? BASE_ROWS;
  if (![minW, maxW, minH, maxH].every(Number.isInteger)) return fail('min / max が整数ではない');
  if (minW < 1 || maxW > BASE_COLS || minW > maxW || minH < 1 || minH > maxH) return fail('min / max の範囲がおかしい');

  const dp = raw.defaultPos || {};
  const x = dp.x ?? 0;
  const y = dp.y ?? 0;
  if (![x, y].every((v) => Number.isInteger(v) && v >= 0)) return fail('defaultPos の位置が正しくない');
  const w = clamp(dp.w ?? maxW, minW, maxW);
  const h = clamp(dp.h ?? minH, minH, maxH);

  return {
    id: raw.id,
    title: raw.title,
    path: typeof raw.path === 'string' && raw.path ? raw.path : null,
    initial: raw.initial === true,
    addable: raw.addable !== false,
    defaultPos: { x: clamp(x, 0, BASE_COLS - w), y, w, h },
    minW, maxW, minH, maxH,
    Component: COMPONENTS[raw.type],
  };
}

const seen = new Set();
export const GADGETS = gadgetsJson
  .map((raw) => {
    const g = normalize(raw, seen);
    if (g) seen.add(g.id);
    return g;
  })
  .filter(Boolean);

export const gadgetById = (id) => GADGETS.find((g) => g.id === id);

// 追加画面に出すもの(今は使う画面がないが、準備しておく)
export const ADDABLE_GADGETS = GADGETS.filter((g) => g.addable);
