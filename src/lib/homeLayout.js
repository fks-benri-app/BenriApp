// ホーム画面の配置。
// ・列数は画面の横幅で決める(gridFor)。マスは正方形で、表示できる行数は画面の高さで決まる(下は、スクロールで続く)
// ・ガジェットの大きさ・位置(gadgets.json)は、基準の列数 BASE_COLS での値。別の列数では比率で変換する(rangeFor)
// ・配置は列数ごとに保存する。まだ保存が無い列数は、近い列数の保存を比率で移して使う
// ・保存するのは「ガジェットIDごとの x / y / w / h(マス)」だけ。中身は src/gadgets/index.js にある
import { storage } from './storage';

export const BASE_COLS = 5;   // gadgets.json の基準の列数
export const BASE_ROWS = 10;  // gadgets.json の基準の行数
const MIN_COLS = 4;
const MAX_COLS = 12;
const TARGET_CELL = 68;       // 1マスの目安の大きさ(px)。これに近づくように列数を決める
const KEY = 'homeLayouts';
const LEGACY_KEY = 'homeLayout'; // 列数を分けていなかった頃の保存(基準の列数として読む)

// 旧コードとの互換用
export const COLS = BASE_COLS;
export const ROWS = BASE_ROWS;

const num = (v, d) => (Number.isFinite(v) ? Math.round(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// 画面の横幅・高さ(px)から、列数・マスの大きさ(px)・表示できる行数を決める
export function gridFor(width, height) {
  const cols = clamp(Math.round(width / TARGET_CELL), MIN_COLS, MAX_COLS);
  const cell = width / cols;
  const rows = Math.max(3, Math.floor(height / cell));
  return { cols, cell, rows };
}

// ガジェットの大きさの範囲と初期位置を、列数に合わせて換算する(基準の列数からの比率)
export function rangeFor(g, cols) {
  const s = cols / BASE_COLS;
  const sc = (v) => Math.max(1, Math.round(v * s));
  const maxW = Math.min(sc(g.maxW), cols);
  const minW = Math.min(sc(g.minW), maxW);
  const maxH = sc(g.maxH);
  const minH = Math.min(sc(g.minH), maxH);
  const defaultW = clamp(sc(g.defaultPos.w), minW, maxW);
  const defaultH = clamp(sc(g.defaultPos.h), minH, maxH);
  const defaultX = clamp(Math.round(g.defaultPos.x * s), 0, cols - defaultW);
  const defaultY = Math.max(0, Math.round(g.defaultPos.y * s));
  return { minW, maxW, minH, maxH, defaultX, defaultY, defaultW, defaultH };
}

// 大きさと位置を、そのガジェットの範囲と画面の列数に収める
export function clampItem(it, g, cols) {
  const r = rangeFor(g, cols);
  const w = clamp(num(it.w, r.defaultW), r.minW, r.maxW);
  const h = clamp(num(it.h, r.defaultH), r.minH, r.maxH);
  const x = clamp(num(it.x, r.defaultX), 0, cols - w);
  const y = Math.max(0, num(it.y, r.defaultY));
  return { id: g.id, x, y, w, h };
}

const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// 重なりを解消し、空いている所へ上から詰める。
// 動かしたガジェットは置いた位置のまま。残りは上の順に、空いている一番上まで移す(隙間を残さない)
export function resolveLayout(items, movedId) {
  const moved = items.filter((i) => i.id === movedId);
  const rest = items.filter((i) => i.id !== movedId).sort((a, b) => a.y - b.y || a.x - b.x);
  const placed = [];
  moved.forEach((it) => {
    const cur = { ...it };
    while (placed.some((p) => overlaps(p, cur))) cur.y += 1;
    placed.push(cur);
  });
  rest.forEach((it) => {
    const cur = { ...it, y: 0 };
    while (placed.some((p) => overlaps(p, cur))) cur.y += 1;
    placed.push(cur);
  });
  return placed;
}

// 保存を読む。列数ごとの保存(旧形式は基準の列数として扱う)
function readAll() {
  try {
    const v = JSON.parse(storage.get(KEY) || 'null');
    if (isObj(v)) return v;
  } catch { /* 壊れていたら次へ */ }
  try {
    const legacy = JSON.parse(storage.get(LEGACY_KEY) || 'null');
    if (isObj(legacy)) return { [BASE_COLS]: legacy };
  } catch { /* 壊れていたら保存なし */ }
  return {};
}

// 保存された配置を、別の列数に比率で移す
function scaleSaved(obj, from, to) {
  const k = to / from;
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, p]) => isObj(p))
      .map(([id, p]) => [id, {
        x: Math.round(num(p.x, 0) * k),
        y: Math.round(num(p.y, 0) * k),
        w: Math.max(1, Math.round(num(p.w, 1) * k)),
        h: Math.max(1, Math.round(num(p.h, 1) * k)),
      }]),
  );
}

// 指定の列数の配置を読む。
// ・その列数の保存があれば、それを使う(保存に無いガジェットは、追加されるまで出ない)
// ・無ければ、一番近い列数の保存を比率で移す
// ・保存が一つも無ければ、initial: true のガジェットを初期位置に置く
export function loadLayout(gadgets, cols) {
  const all = readAll();
  let source = null;
  if (isObj(all[cols])) {
    source = all[cols];
  } else {
    const nearest = Object.keys(all)
      .map(Number)
      .filter((k) => Number.isFinite(k) && k > 0 && isObj(all[k]))
      .sort((a, b) => Math.abs(a - cols) - Math.abs(b - cols))[0];
    if (nearest !== undefined) source = scaleSaved(all[nearest], nearest, cols);
  }

  let items;
  if (source) {
    items = gadgets
      .filter((g) => isObj(source[g.id]))
      .map((g) => clampItem({ ...source[g.id], id: g.id }, g, cols));
  } else {
    items = gadgets
      .filter((g) => g.initial)
      .map((g) => {
        const r = rangeFor(g, cols);
        return { id: g.id, x: r.defaultX, y: r.defaultY, w: r.defaultW, h: r.defaultH };
      });
  }
  return resolveLayout(items, null);
}

// ガジェットを追加する(追加画面から使う。今はまだ呼ばれていない)。一番下に置く
export function addToLayout(layout, g, cols) {
  if (layout.some((i) => i.id === g.id)) return layout;
  const r = rangeFor(g, cols);
  const bottom = layout.reduce((m, i) => Math.max(m, i.y + i.h), 0);
  const item = clampItem({ id: g.id, x: r.defaultX, y: bottom, w: r.defaultW, h: r.defaultH }, g, cols);
  return resolveLayout([...layout, item], g.id);
}

// 指定の列数の配置を保存する。ほかの列数の保存は残す
export function saveLayout(items, cols) {
  const all = readAll();
  all[cols] = Object.fromEntries(items.map((i) => [i.id, { x: i.x, y: i.y, w: i.w, h: i.h }]));
  storage.set(KEY, JSON.stringify(all));
}
