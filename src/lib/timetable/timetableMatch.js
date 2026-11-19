// 読み取った文字と、授業名の候補を照合する(時間割の読み取りのテスト用)
// 読み取りの誤りは「空白が入る」「全角と半角が違う」「文字が1つ入れ替わる」として現れるので、
// 比べる前に形をそろえ、編集距離(何文字直せば同じになるか)で近さを測る。

const GREEK = { 'α': 'a', 'β': 'b', 'γ': 'g' };

// 比べるための形にそろえる。区分の印「(F)」「(CF2)」は、授業の同じ・違いには使わない
export function normalizeForMatch(text) {
  let s = String(text).normalize('NFKC');     // 全角→半角、丸数字→数字、Ⅱ→II
  s = s.replace(/[αβγ]/g, (c) => GREEK[c]);
  s = s.replace(/\((?:[A-Za-z]{0,3}\d?)\)?/g, ''); // (F) (F (CF2) (P ...
  s = s.replace(/[()]/g, '');
  s = s.replace(/\s+/g, '');                   // 文字の間に入った空白
  s = s.toLowerCase();
  // 「Ⅱ」は「T」「t」「I」「l」などに読まれやすいので、同じ文字として扱う
  return s.replace(/[tl|1]/g, 'i');
}

// 候補の文字を、どれだけ直せば読み取った文字の一部と同じになるかを返す(あいまい一致)
// 読み取った行のどこに候補があっても見つけられるよう、行の先頭からの一致は必須にしない
export function fuzzyDistance(pattern, text) {
  const p = Array.from(pattern);
  const t = Array.from(text);
  const m = p.length;
  if (!m) return 0;
  let prev = new Array(t.length + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    const cur = new Array(t.length + 1);
    cur[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = p[i - 1] === t[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return Math.min(...prev);
}

// 候補の長さに応じて、許す誤りの数(短すぎる候補は誤りを許さない)
export function allowedErrors(keyLength) {
  if (keyLength <= 2) return 0;
  return Math.max(1, Math.round(keyLength * 0.3));
}

// 読み取った行ごとに、近い候補をすべて出す(1行に複数の授業が入ることがあるので、1つに絞らない)
// 戻り値: [{ text, confidence, hits: [{candidate, dist}] }]
export function matchLines(lines, candidates) {
  const keyed = candidates
    .map((c) => ({ candidate: c, key: normalizeForMatch(c) }))
    .filter((k) => k.key.length > 0);
  return lines.map((line) => {
    const text = normalizeForMatch(line.text);
    const hits = keyed
      .map((k) => ({ candidate: k.candidate, dist: fuzzyDistance(k.key, text), allowed: allowedErrors(k.key.length) }))
      .filter((h) => h.dist <= h.allowed)
      .sort((a, b) => a.dist - b.dist)
      .map(({ candidate, dist }) => ({ candidate, dist }));
    return { text: line.text, confidence: line.confidence, hits };
  });
}

// 候補ごとに、全行の中でいちばん近い一致を返す
// near: 同じ行で、同じくらい近い別の候補(区別がつかないかもしれない印)
export function coverage(lineResults, candidates) {
  return candidates.map((c) => {
    let found = null;
    for (const r of lineResults) {
      const mine = r.hits.find((h) => h.candidate === c);
      if (!mine) continue;
      if (!found || mine.dist < found.dist) {
        const near = r.hits.filter((h) => h.candidate !== c && h.dist <= mine.dist).map((h) => h.candidate);
        found = { dist: mine.dist, text: r.text, near };
      }
    }
    return { candidate: c, found };
  });
}
