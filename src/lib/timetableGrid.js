// 読み取った文字の位置から、授業表(曜日×時限)を組み立てる(時間割の読み取りのテスト用)
// 手順: 1. 曜日の見出しの位置で表の範囲を決める 2. 表の中の文字を、列(曜日)と行(時限)に分ける
//       3. 各マスの文字を、授業名の候補と照合する
import { allowedErrors, fuzzyDistance, normalizeForMatch } from './timetableMatch';

const INFO_CHARS = '席号名';
const MIN_CONF = 60; // これより信頼度が低い文字は、表の外の汚れとみなして捨てる

// 1次元の k-means(値を k 個の群に分け、群ごとの中心の昇順で群番号を返す)
export function kmeans1d(values, k) {
  if (values.length === 0) return { labels: [], centers: [] };
  const sorted = [...values].sort((a, b) => a - b);
  // 初期値は、値の分布を等分した位置
  let centers = Array.from({ length: k }, (_, i) => sorted[Math.min(sorted.length - 1, Math.floor(((i + 0.5) * sorted.length) / k))]);
  let labels = new Array(values.length).fill(0);
  for (let iter = 0; iter < 30; iter++) {
    labels = values.map((v) => {
      let best = 0;
      for (let i = 1; i < k; i++) if (Math.abs(v - centers[i]) < Math.abs(v - centers[best])) best = i;
      return best;
    });
    const sums = new Array(k).fill(0);
    const counts = new Array(k).fill(0);
    labels.forEach((l, i) => { sums[l] += values[i]; counts[l] += 1; });
    const next = centers.map((c, i) => (counts[i] ? sums[i] / counts[i] : c));
    if (next.every((c, i) => Math.abs(c - centers[i]) < 0.5)) { centers = next; break; }
    centers = next;
  }
  // 中心の小さい順に並べ替えて、番号をつけ直す
  const order = centers.map((c, i) => ({ c, i })).sort((a, b) => a.c - b.c);
  const rank = new Array(k);
  order.forEach((o, r) => { rank[o.i] = r; });
  return { labels: labels.map((l) => rank[l]), centers: order.map((o) => o.c) };
}

const center = (b) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });

// 表の上端を決める。
// 1. 情報欄(席・号・名)が読めていれば、その下
// 2. 読めていなければ、授業名の候補が最初に現れる行の、少し上
// (文字の高さは読み取りごとに変わるので、文字の高さを基準にする)
export function findTableTop(words, candidates) {
  const charH = median(words.map((w) => w.bbox.y1 - w.bbox.y0)) || 20;
  const maxY = Math.max(...words.map((w) => center(w.bbox).y));
  const info = words.filter((w) => INFO_CHARS.includes(w.text.charAt(0)) && center(w.bbox).y < maxY * 0.3);
  if (info.length) return Math.max(...info.map((w) => center(w.bbox).y)) + 5;

  const keys = candidates.map(normalizeForMatch).filter((k) => k.length > 0);
  const lines = groupByY(words, charH * 0.8);
  for (const line of lines) {
    const text = normalizeForMatch(line.words.map((w) => w.text).join(''));
    if (keys.some((k) => fuzzyDistance(k, text) <= allowedErrors(k.length))) return line.y - charH * 2;
  }
  return -Infinity;
}

function median(values) {
  const a = values.filter((v) => v > 0).sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
}

// 縦の位置が近い文字を、同じ行にまとめる(行の代表の高さ順)
function groupByY(words, gap) {
  const sorted = [...words].sort((a, b) => center(a.bbox).y - center(b.bbox).y);
  const lines = [];
  for (const w of sorted) {
    const y = center(w.bbox).y;
    const cur = lines[lines.length - 1];
    if (cur && y - cur.lastY <= gap) {
      cur.words.push(w);
      cur.lastY = y;
    } else {
      lines.push({ y, lastY: y, words: [w] });
    }
  }
  return lines.map((l) => ({ y: l.y, words: l.words.sort((a, b) => center(a.bbox).x - center(b.bbox).x) }));
}

// 見出し(「月曜日」「1限目」)が読めていれば、その位置から列と行を決めて組み立てる(PaddleOCR など、行単位で読めるとき向け)
// 戻り値: { top, dayLabels, periodLabels, rows } か、見出しが足りなければ null
export function buildGridByLabels(items, candidates) {
  const usable = items.filter((w) => w.text.trim());
  const dayHeads = [];
  const periodHeads = [];
  for (const w of usable) {
    const t = w.text.normalize('NFKC').replace(/\s+/g, '');
    const d = t.match(/^([月火水木金土日])曜/);
    if (d && t.length <= 4) { dayHeads.push({ label: d[1], x: center(w.bbox).x, y: center(w.bbox).y }); continue; }
    const p = t.match(/^(\d)限/);
    if (p && t.length <= 4) periodHeads.push({ n: Number(p[1]), x: center(w.bbox).x, y: center(w.bbox).y });
  }
  // 同じ曜日・同じ時限が2回出たら、最初のものだけを使う
  const uniq = (list, key) => list.filter((a, i) => list.findIndex((b) => b[key] === a[key]) === i);
  const days = uniq(dayHeads, 'label').sort((a, b) => a.x - b.x);
  const periods = uniq(periodHeads, 'n').sort((a, b) => a.y - b.y);
  if (days.length < 3 || periods.length < 2) return null;

  const colGap = (days[days.length - 1].x - days[0].x) / (days.length - 1);
  const rowGap = (periods[periods.length - 1].y - periods[0].y) / (periods.length - 1);
  // 時限の見出しは、行の上寄りにあるので、行の範囲は見出しの少し上から次の見出しの少し上まで
  const lead = rowGap * 0.25;
  const rowTop = (i) => periods[i].y - lead;
  const rowBottom = (i) => (i + 1 < periods.length ? periods[i + 1].y - lead : periods[i].y + rowGap - lead);

  const keyed = candidates
    .map((c) => ({ candidate: c, key: normalizeForMatch(c) }))
    .filter((k) => k.key.length > 0);

  const cells = periods.map(() => days.map(() => []));
  for (const w of usable) {
    const c = center(w.bbox);
    if (c.y < rowTop(0) || c.y >= rowBottom(periods.length - 1)) continue;
    const ci = days.reduce((best, d, i) => (Math.abs(d.x - c.x) < Math.abs(days[best].x - c.x) ? i : best), 0);
    if (Math.abs(days[ci].x - c.x) > colGap * 0.6) continue; // どの曜日の列にも入らない(時限の見出しなど)
    const ri = periods.findIndex((_, i) => c.y >= rowTop(i) && c.y < rowBottom(i));
    if (ri >= 0) cells[ri][ci].push({ w, y: c.y, x: c.x });
  }

  const rows = cells.map((rowCells, r) => ({
    period: periods[r].n,
    cells: rowCells.map((list, c) => {
      const sorted = [...list].sort((a, b) => a.y - b.y);
      const lines = sorted.map((s) => s.w.text);
      const raw = lines.join('');
      if (!raw) return { day: c, raw: '', lines: [], match: null };
      // 授業名は最初の行にあることが多いが、決めつけず、どの行でも候補にいちばん近いものを選ぶ
      let best = null;
      for (const line of lines) {
        const text = normalizeForMatch(line);
        for (const k of keyed) {
          const dist = fuzzyDistance(k.key, text);
          if (dist <= allowedErrors(k.key.length) && (!best || dist < best.dist)) best = { candidate: k.candidate, dist };
        }
      }
      return { day: c, raw, lines, match: best };
    }),
  }));
  return { top: rowTop(0), dayLabels: days.map((d) => d.label), periodLabels: periods.map((p) => p.n), rows };
}

// 表の中の文字を、曜日×時限のマスに分け、マスごとに候補と照合する
// days: 曜日の数(月〜)、periods: 時限の数
export function buildGrid(words, candidates, { days = 6, periods = 7 } = {}) {
  const byLabels = buildGridByLabels(words.filter((w) => w.confidence >= MIN_CONF), candidates);
  if (byLabels) return byLabels;
  const usable = words.filter((w) => w.confidence >= MIN_CONF && w.text.trim());
  const top = findTableTop(usable, candidates);
  const table = usable.filter((w) => center(w.bbox).y > top);
  if (table.length === 0) return { top, rows: [] };

  // 列: 曜日の数だけに分ける(時限の見出しは読めないことが多いので、列として数えない)
  const xs = table.map((w) => center(w.bbox).x);
  const colK = kmeans1d(xs, days);
  // 行: 上の見出しを除いて periods 群
  const ys = table.map((w) => center(w.bbox).y);
  const rowK = kmeans1d(ys, periods);

  const keyed = candidates
    .map((c) => ({ candidate: c, key: normalizeForMatch(c) }))
    .filter((k) => k.key.length > 0);

  const cells = Array.from({ length: periods }, () => Array.from({ length: days }, () => []));
  table.forEach((w, i) => {
    const c = colK.labels[i];
    const r = rowK.labels[i];
    if (c >= 0 && c < days && r >= 0 && r < periods) cells[r][c].push({ w, y: center(w.bbox).y, x: center(w.bbox).x });
  });

  const rows = cells.map((rowCells, r) => ({
    period: r + 1,
    cells: rowCells.map((list, c) => {
      const sorted = [...list].sort((a, b) => (Math.abs(a.y - b.y) > 20 ? a.y - b.y : a.x - b.x));
      const raw = sorted.map((s) => s.w.text).join('');
      if (!raw) return { day: c, raw: '', match: null };
      const text = normalizeForMatch(raw);
      let best = null;
      for (const k of keyed) {
        const dist = fuzzyDistance(k.key, text);
        if (dist <= allowedErrors(k.key.length) && (!best || dist < best.dist)) best = { candidate: k.candidate, dist };
      }
      return { day: c, raw, match: best };
    }),
  }));
  return { top, rows };
}
