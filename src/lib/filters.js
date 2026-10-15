// 絞り込みに使う関数だけを集めたファイル(Firebase に依存しないので、単体でテストできる)

// 全角/半角・大文字/小文字の違いを無視して検索できるようにそろえる
export const normalize = (s) => String(s || '').normalize('NFKC').toLowerCase();

// ===== 授業 =====
// メールの授業名「２-CF② 体育 2026」→ 表示名「２-CF② 体育」
// (空白やアンダースコアを整え、末尾の年(2026 / 2026年度)は外す)
export function courseLabel(courseName) {
  return String(courseName || '')
    .replace(/[_＿]+/g, ' ') // アンダースコアをスペースに置換
    .replace(/\s+/g, ' ')
    .replace(/\s*(?:19|20)\d{2}(?:年度)?$/, '')
    .trim();
}

// 絞り込みに使うキー(「２」と「2」のような表記ゆれを同じ授業として扱う)
export function courseKey(courseName) {
  return normalize(shortCourse(courseName));
}

// ===== 形式 =====
export const KIND_OPTIONS = [
  { id: 'announcement', label: 'お知らせ' },
  { id: 'assignment', label: '課題' },
  { id: 'material', label: '資料' },
];

// GAS が保存している category(「新しいお知らせ」「新しい課題」など)から形式を決める。
export function kindOf(category) {
  const c = normalize(category);
  if (/課題|assignment/.test(c)) return 'assignment';
  if (/資料|material/.test(c)) return 'material';
  if (/お知らせ|announcement/.test(c)) return 'announcement';
  return 'other';
}

// ===== 絞り込みメニュー用 =====
// 手元のお知らせから、授業の選択肢を作る(件数つき、名前順)
export function buildCourseOptions(items) {
  const map = new Map();
  for (const a of items) {
    if (!a.courseKey) continue;
    const cur = map.get(a.courseKey);
    if (cur) cur.count += 1;
    else map.set(a.courseKey, { id: a.courseKey, label: a.courseLabel, count: 1 });
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'ja'));
}

/**
 * @param items   useAnnouncements() の items
 * @param filters { tag: 'all'|'unread'|'read'|'test'|'festival', course: ''|キー, kind: ''|形式id, query: string }
 */
export function filterAnnouncements(items, { tag = 'all', course = '', kind = '', query = '' }) {
  const q = normalize(String(query).trim());
  return items.filter((a) => {
    if (tag === 'unread' && !a.isUnread) return false;
    if (tag === 'read' && a.isUnread) return false;
    if ((tag === 'test' || tag === 'festival') && a.tag !== tag) return false;
    if (course && a.courseKey !== course) return false;
    if (kind && a.kind !== kind) return false;
    if (!q) return true;
    return normalize(`${a.subject} ${a.courseFull} ${a.teacher} ${a.content}`).includes(q);
  });
}

// ===== 表示用の文章の整え =====
const CJK = '\\u3000-\\u303f\\u3040-\\u30ff\\u3400-\\u9fff\\uff00-\\uffef';
const CJK_GAP = new RegExp(`([${CJK}])[ \\t\\u3000]+(?=[${CJK}])`, 'g');
const wideChar = new RegExp(`[${CJK}]`);
const displayWidth = (s) => [...s].reduce((n, c) => n + (wideChar.test(c) ? 2 : 1), 0);

export const closeCjkGaps = (s) => String(s || '').replace(CJK_GAP, '$1');

export function cleanText(text) {
  return closeCjkGaps(
    String(text || '')
      .split('\n')
      .map((line) => line.replace(/https?:\/\/\S+/g, '').trim())
      .filter((line) => line && !/AccountChooser|accounts\.google\.com|@g\.nagano-c\.ed.jp/.test(line))
      .join('\n')
  );
}

const SENTENCE_END = /[。！？!?」』）🥹…:：]$/;
export function joinTitleAndBody(title, body) {
  if (!title) return body;
  if (!body) return title;
  const wrapped = displayWidth(title) >= 56 && !SENTENCE_END.test(title);
  return wrapped ? closeCjkGaps(`${title} ${body}`) : `${title}\n${body}`;
}

// 授業名から教科名だけを取り出す（数字や学年、講座、記号などのノイズを自動で排除）
export function shortCourse(courseName) {
  const cleaned = courseLabel(courseName)
    .replace(/[（(].*?[）)]/g, ' ')                      // 括弧内を除外
    .replace(/[0-9０-９]+[年学年組Ff号講座クラスＣＦ]+/g, ' ') // 数字＋クラス・学年等の残骸を除外
    .replace(/[0-9０-９]+/g, ' ')                          // 残った単体の数字も除外
    .replace(/[-―_＿()（）[\]【】・]/g, ' ');             // 各種記号をスペースに

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  
  // 日本語の文字（漢字・ひらがな・カタカナ）を含み、ノイズワードを含まない最初の語を教科名とする
  const subject = tokens.find((t) => /[\u3040-\u30ff\u3400-\u9fff]/.test(t) && !/組|年度|入学|学年|講座|年/.test(t));
  
  return subject || tokens[0] || '';
}

// 差出人名「秋本裕子 さん（Classroom）」から「（Classroom）」を取り除く
export function cleanTeacher(name) {
  return String(name || '')
    .replace(/\s*[（(]\s*(?:Google\s*)?Classroom\s*[）)]\s*$/i, '')
    .trim();
}