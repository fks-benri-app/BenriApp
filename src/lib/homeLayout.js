// ホーム画面の配置。画面を COLS 列 × ROWS 行に等分し、ガジェットは整数のマス単位で置く。
// 保存するのは「ガジェットIDごとの x / y / w / h(マス)」だけ。中身は src/gadgets/index.js にある。
import { storage } from './storage';

const KEY = 'homeLayout';
export const COLS = 4;   // 横は4分割
export const ROWS = 10;  // 縦は画面の高さを10分割(これより下は、スクロールで続く)

const num = (v, d) => (Number.isFinite(v) ? Math.round(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 大きさと位置を、そのガジェットの最小・最大の範囲と画面の中に収める
function clampItem(it, g) {
  const w = clamp(num(it.w, g.defaultPos.w), g.minW, Math.min(g.maxW, COLS));
  const h = clamp(num(it.h, g.defaultPos.h), g.minH, g.maxH);
  const x = clamp(num(it.x, 0), 0, COLS - w);
  const y = Math.max(0, num(it.y, 0));
  return { id: g.id, x, y, w, h };
}

const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// 重なりを解消する。動かしたガジェットを先に置き、残りは上から順に、重ならない所まで下へ押し下げる
export function resolveLayout(items, movedId) {
  const moved = items.filter((i) => i.id === movedId);
  const rest = items.filter((i) => i.id !== movedId).sort((a, b) => a.y - b.y || a.x - b.x);
  const placed = [];
  [...moved, ...rest].forEach((it) => {
    const cur = { ...it };
    while (placed.some((p) => overlaps(p, cur))) cur.y += 1;
    placed.push(cur);
  });
  return placed;
}

// 保存された配置を読む。足りないガジェットは初期位置、おかしい値は範囲内に直す
export function loadLayout(gadgets) {
  let saved = {};
  try {
    const v = JSON.parse(storage.get(KEY) || 'null');
    if (v && typeof v === 'object' && !Array.isArray(v)) saved = v;
  } catch { /* 壊れていたら初期配置 */ }
  const items = gadgets.map((g) => clampItem({ ...g.defaultPos, ...(saved[g.id] || {}), id: g.id }, g));
  return resolveLayout(items, null);
}

export function saveLayout(items) {
  const obj = Object.fromEntries(items.map((i) => [i.id, { x: i.x, y: i.y, w: i.w, h: i.h }]));
  storage.set(KEY, JSON.stringify(obj));
}
